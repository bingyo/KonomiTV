/**
 * ARIB 字幕の DRCS (字幕データに埋め込まれて送られてくるビットマップ外字) の高速レンダラー
 *
 * ケータイマークのような ARIB 追加記号にない記号や、人名などの特殊な漢字は DRCS として送られてくることが多い
 * aribb24.js の標準実装は DRCS の 1 ドットごとに fillRect() を発行し、さらに縁取りのために全ドットの描画を
 * 上下左右にずらして 25 回 (描画解像度が 1920×1080 を超える場合は 81 回) 繰り返す
 * 字幕 1 回の描画は viewCanvas / rawCanvas の 2 枚分行われるため、DRCS 1 文字あたり 2 万〜 4 万回もの fillRect() が
 * 発行され (通常の文字は strokeText + fillText の 2 回で済む)、そのすべてが GPU プロセスへ転送されてラスタライズされる
 * GPU プロセスは映像の合成も担当しているため、Fire TV (Silk) のような非力な環境では、DRCS 入りの字幕が表示される
 * たびに映像全体が一瞬止まる要因となる
 *
 * そこで、ドットを隣接するもの同士で 1 つの矩形にまとめてから描画することで、描画結果を変えずに fillRect() の
 * 発行回数を字形にもよるが 1/50 〜 1/300 程度に削減し、負荷を通常の文字と同程度に抑える
 *
 * aribb24.js は DPlayer のバンドルに内包されていて外から差し替えられないため、Vite プラグイン
 * (vite-plugins/DPlayerCaptionDRCSPatch.mts) でバンドル内の DRCS 描画ループをこのレンダラーの呼び出しに書き換えている
 */

// 縁取りの太さ (ドット単位)
// aribb24.js の縁取りは 1 ドット分の矩形を ±2 ドット分の範囲で隙間なくずらして描画するものなので、
// その塗りつぶし範囲は描画解像度に関わらず「各ドットを上下左右に 2 ドットずつ太らせた範囲」に等しい
const OUTLINE_DOTS = 2;


/**
 * 2 値マスクの塗りつぶし部分を、隣接するドット同士をまとめた矩形群として描画する
 * マスクを上から順に走査し、見つけた塗りつぶしドットから横方向・縦方向に矩形を広げていく貪欲法でまとめる
 * 矩形同士は重ならないため、半透明色でも矩形の境界に濃淡が出ない
 * @param context 描画先の 2D コンテキスト (fillStyle は呼び出し元で設定しておく)
 * @param mask 1 ドット 1 バイトの 2 値マスク (0: 透明, 1: 塗りつぶし)。処理の過程で破壊される
 * @param columns マスクの横ドット数
 * @param origin_x マスク左上の描画先 X 座標 (px)
 * @param origin_y マスク左上の描画先 Y 座標 (px)
 * @param dot_width 1 ドットの描画先での幅 (px)
 * @param dot_height 1 ドットの描画先での高さ (px)
 */
function fillMaskAsMergedRects(
    context: CanvasRenderingContext2D,
    mask: Uint8Array,
    columns: number,
    origin_x: number,
    origin_y: number,
    dot_width: number,
    dot_height: number,
): void {
    const rows = mask.length / columns;
    for (let row = 0; row < rows; row++) {
        const row_offset = row * columns;
        for (let column = 0; column < columns; column++) {
            // 透明なドットと、すでに他の矩形に含めたドットは飛ばす
            if (mask[row_offset + column] === 0) continue;

            // 横方向に、塗りつぶしドットが続く限り矩形を広げる
            let column_end = column + 1;
            while (column_end < columns && mask[row_offset + column_end] === 1) {
                column_end++;
            }

            // 縦方向に、次の行の同じ範囲がすべて塗りつぶしである限り矩形を広げる
            let row_end = row + 1;
            while (row_end < rows) {
                const next_row_offset = row_end * columns;
                let is_all_filled = true;
                for (let check_column = column; check_column < column_end; check_column++) {
                    if (mask[next_row_offset + check_column] === 0) {
                        is_all_filled = false;
                        break;
                    }
                }
                if (is_all_filled === false) break;
                row_end++;
            }

            // 矩形に含めたドットを消して、以降の走査で再度描画されないようにする
            for (let consumed_row = row; consumed_row < row_end; consumed_row++) {
                const consumed_row_offset = consumed_row * columns;
                mask.fill(0, consumed_row_offset + column, consumed_row_offset + column_end);
            }

            context.fillRect(
                origin_x + column * dot_width,
                origin_y + row * dot_height,
                (column_end - column) * dot_width,
                (row_end - row) * dot_height,
            );

            // 矩形の右端の次のドットから走査を再開する
            column = column_end - 1;
        }
    }
}


/**
 * DRCS の 1 文字を縁取り付きで描画する
 * aribb24.js の CanvasProvider.renderCharacter() にある DRCS 描画ループを置き換えるもので、不透明色での描画結果は
 * ピクセル単位で同一となる (半透明の縁取り色のみ、重ね塗りで濃くならない分だけ標準実装より薄く描画される)
 * 引数の値はすべて aribb24.js 側で計算されたものをそのまま受け取る
 * @param context 描画先の 2D コンテキスト (変形行列は単位行列である前提)
 * @param bitmap DRCS のビットマップデータ (上位ビットから順に、左上から右下へ 1 ドット depth ビットで並ぶ)
 * @param width DRCS の横ドット数
 * @param height DRCS の縦ドット数
 * @param depth 1 ドットあたりのビット数 (階調は使わず、値が 0 より大きいドットをすべて塗りつぶす)
 * @param origin_x DRCS 左上の描画先 X 座標 (px)
 * @param origin_y DRCS 左上の描画先 Y 座標 (px)
 * @param dot_width 1 ドットの描画先での幅 (px)
 * @param dot_height 1 ドットの描画先での高さ (px)
 * @param outline_color 縁取りの色。縁取りをしない場合は null
 * @param fill_color 文字本体の色
 */
export function renderCaptionDRCSGlyph(
    context: CanvasRenderingContext2D,
    bitmap: Uint8Array,
    width: number,
    height: number,
    depth: number,
    origin_x: number,
    origin_y: number,
    dot_width: number,
    dot_height: number,
    outline_color: string | null,
    fill_color: string,
): void {
    // ビットマップを 1 ドット 1 バイトの 2 値マスクに展開する
    const glyph_mask = new Uint8Array(width * height);
    for (let dot_index = 0; dot_index < glyph_mask.length; dot_index++) {
        for (let bit = 0; bit < depth; bit++) {
            const bit_index = dot_index * depth + bit;
            if ((bitmap[bit_index >> 3] & (0x80 >> (bit_index & 7))) !== 0) {
                glyph_mask[dot_index] = 1;
                break;
            }
        }
    }

    // 縁取りを先に描画する (本体がその上に重なる)
    if (outline_color !== null) {
        // 各ドットを上下左右に太らせたマスクを作る (太らせた分だけ DRCS 本体より一回り大きくなる)
        const outline_columns = width + OUTLINE_DOTS * 2;
        const outline_rows = height + OUTLINE_DOTS * 2;
        const outline_mask = new Uint8Array(outline_columns * outline_rows);
        const outline_span = OUTLINE_DOTS * 2 + 1;
        for (let row = 0; row < height; row++) {
            for (let column = 0; column < width; column++) {
                if (glyph_mask[row * width + column] === 0) continue;
                for (let outline_row = row; outline_row < row + outline_span; outline_row++) {
                    const outline_start = outline_row * outline_columns + column;
                    outline_mask.fill(1, outline_start, outline_start + outline_span);
                }
            }
        }
        context.fillStyle = outline_color;
        fillMaskAsMergedRects(
            context,
            outline_mask,
            outline_columns,
            origin_x - OUTLINE_DOTS * dot_width,
            origin_y - OUTLINE_DOTS * dot_height,
            dot_width,
            dot_height,
        );
    }

    // 文字本体を描画する
    context.fillStyle = fill_color;
    fillMaskAsMergedRects(context, glyph_mask, width, origin_x, origin_y, dot_width, dot_height);
}
