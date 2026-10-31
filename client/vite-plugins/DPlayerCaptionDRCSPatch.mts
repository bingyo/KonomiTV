import { readFile } from 'node:fs/promises';

import type { Plugin } from 'vite';


// パッチの対象となる DPlayer のビルド済みバンドル (Windows のパス区切りにも対応する)
const DPLAYER_BUNDLE_PATH_PATTERN = /[\\/]dplayer[\\/]dist[\\/]DPlayer\.min\.js$/;

// aribb24.js の CanvasProvider.renderCharacter() にある、DRCS の描画ループ前後の minify 済みコード
// 変数の対応: r: 描画先の 2D コンテキスト / T: DRCS のビットマップ / E: 横ドット数 / B: 縦ドット数 /
//            I: 1 ドットあたりのビット数 / F: 縁取りのカラーコード / e: CanvasProvider クラス自身
const DRCS_LOOP_PRECEDING_CODE = 'F=this.getOrnColorCode();';
const DRCS_LOOP_START = 'if(F&&(!this.force_orn||!0===this.force_orn||this.force_orn!==this.fg_color)){r.fillStyle=e.getRGBAfromColorCode(F);for(var R=-2*this.height_magnification()';
const DRCS_LOOP_END = '2*this.height_magnification())}}this.move_relative_pos(1,0)';

// 描画ループの直前に挿入するコード
// PlayerController が window に登録した CaptionDRCSRenderer があればそれで描画し、なければ元の描画ループを実行する
// 座標や色の計算式は、元の描画ループ内の式からループ変数の項を除いたもの
const DRCS_RENDERER_CALL = [
    'if(window.KonomiTVCaptionDRCSRenderer){window.KonomiTVCaptionDRCSRenderer(r,T,E,B,I,',
    '(this.position_x+Math.floor(this.shs*this.text_size_x/2))*this.width_magnification(),',
    '(this.position_y-this.height()+Math.floor(this.svs*this.text_size_y/2))*this.height_magnification(),',
    '2*this.width_magnification(),2*this.height_magnification(),',
    'F&&(!this.force_orn||!0===this.force_orn||this.force_orn!==this.fg_color)?e.getRGBAfromColorCode(F):null,',
    'e.getRGBAfromColorCode(this.fg_color))}else{',
].join('');


/**
 * DPlayer のバンドル内の DRCS 描画ループを、CaptionDRCSRenderer の呼び出しに書き換える
 * 元の描画ループは DRCS 1 文字あたり数万回の fillRect() を発行し、Fire TV (Silk) のような非力な環境では
 * 字幕の表示時に映像全体が一瞬止まる要因となる (詳細は src/services/player/CaptionDRCSRenderer.ts を参照)
 * 元の描画ループは、レンダラーが window に登録されていない場合のフォールバックとして残している
 * @param code DPlayer のバンドルのソースコード
 * @returns 書き換え後のソースコード
 * @throws 書き換え位置がちょうど 1 箇所ずつ見つからなかった場合
 */
export function patchDPlayerBundle(code: string): string {
    // DPlayer の更新でコードが変わった場合に、気付かないままパッチが効かなくなるのを防ぐためビルドを失敗させる
    for (const anchor of [DRCS_LOOP_PRECEDING_CODE + DRCS_LOOP_START, DRCS_LOOP_END]) {
        if (code.split(anchor).length !== 2) {
            throw new Error(
                '[DPlayerCaptionDRCSPatch] Failed to patch the DRCS rendering loop in DPlayer.min.js. ' +
                'If DPlayer or aribb24.js was updated, update the anchors in vite-plugins/DPlayerCaptionDRCSPatch.mts.',
            );
        }
    }
    // 置換文字列中の $ が特殊な意味を持たないよう、関数形式で置換する
    return code
        // 描画ループの直前にレンダラーの呼び出しと else ブロックの開始を挿入する
        .replace(DRCS_LOOP_PRECEDING_CODE + DRCS_LOOP_START, () => DRCS_LOOP_PRECEDING_CODE + DRCS_RENDERER_CALL + DRCS_LOOP_START)
        // 描画ループの直後に else ブロックを閉じる } を挿入する
        .replace(DRCS_LOOP_END, () => DRCS_LOOP_END.replace('}}', '}}}'));
}


/**
 * DPlayer のバンドルに内包された aribb24.js の DRCS 描画ループを書き換える Vite プラグイン
 * aribb24.js は DPlayer のビルド済みバンドルに内包されていて、実行時に差し替えることも import し直すこともできないため、
 * バンドルの読み込み時にソースコードを書き換える
 * @returns Vite プラグイン
 */
export function dplayerCaptionDRCSPatch(): Plugin {
    return {
        name: 'konomitv:dplayer-caption-drcs-patch',
        enforce: 'pre',
        // 開発サーバーでは、DPlayer は esbuild による依存関係の事前バンドルを経由して読み込まれる
        // transform フックは事前バンドルには適用されないため、esbuild プラグインとして別途登録する
        // 事前バンドルはキャッシュされるので、パッチの内容を変更した際は vite --force でキャッシュを作り直す必要がある
        config() {
            return {
                optimizeDeps: {
                    esbuildOptions: {
                        plugins: [{
                            name: 'konomitv:dplayer-caption-drcs-patch',
                            setup(build) {
                                build.onLoad({filter: DPLAYER_BUNDLE_PATH_PATTERN}, async (args) => ({
                                    contents: patchDPlayerBundle(await readFile(args.path, 'utf8')),
                                    loader: 'js',
                                }));
                            },
                        }],
                    },
                },
            };
        },
        // プロダクションビルドでは、通常のモジュールとして読み込まれる
        transform(code, id) {
            if (DPLAYER_BUNDLE_PATH_PATTERN.test(id) === false) return null;
            return {code: patchDPlayerBundle(code), map: null};
        },
    };
}
