<template>
    <!-- ベース画面の中にそれぞれの設定画面で異なる部分を記述する -->
    <SettingsBase>
        <h2 class="settings__heading">
            <a v-ripple class="settings__back-button" @click="$router.back()">
                <Icon icon="fluent:chevron-left-12-filled" width="27px" />
            </a>
            <Icon icon="fluent:subtitles-16-filled" width="25px" />
            <span class="ml-3">字幕</span>
        </h2>
        <div class="settings__content">
            <!-- 字幕設定のライブプレビュー -->
            <!-- 下の各設定 (フォント・縁取り・不透明度・文字サイズ) の値をリアルタイムに反映し、
                 設定画面から離れることなく、実際の見え方を確認できるようにする -->
            <div class="settings__item caption-preview">
                <label class="settings__item-heading">プレビュー</label>
                <label class="settings__item-label">
                    下の各設定を変更すると、字幕の見え方がここにリアルタイムで反映されます。<br>
                </label>
                <!-- 映像を模した 16:9 のダーク背景。字幕レイヤーの transform 基準となるよう relative にする -->
                <div class="caption-preview__screen">
                    <!-- 字幕レイヤー: 実描画 (App.vue の `.dplayer-video-wrap-aspect > canvas`) と同じくフルサイズに敷く -->
                    <div class="caption-preview__layer">
                        <!-- 字幕テキスト: ARIB の自然表示位置 (画面下端から約 30%) に配置する
                             実描画では字幕の実描画中心を transform-origin にして「その場で拡大縮小」されるため、
                             プレビューでもテキスト自身を中心基準でスケールし、サイズ変更時に位置がズレないようにする -->
                        <span class="caption-preview__text" :style="captionTextStyle">こんばんは。今日のニュースをお伝えします。</span>
                    </div>
                </div>
            </div>
            <div class="settings__item">
                <label class="settings__item-heading">字幕のフォント</label>
                <label class="settings__item-label">
                    プレイヤーで字幕表示をオンにしているときの、字幕のフォントを設定します。<br>
                </label>
                <v-select class="settings__item-form" color="primary" variant="outlined" hide-details
                    :density="is_form_dense ? 'compact' : 'default'"
                    :items="caption_font" v-model="settingsStore.settings.caption_font">
                </v-select>
            </div>
            <div class="settings__item settings__item--switch">
                <label class="settings__item-heading" for="always_border_caption_text">字幕の文字を常に縁取りする</label>
                <label class="settings__item-label" for="always_border_caption_text">
                    オンにすると、字幕の文字が縁取りされてより見やすくなります。とくに理由がなければ、オンにしておくのがおすすめです。<br>
                    オフのときも、字幕データから明示的に縁取りを指定されている場合には、オンのときと同様に字幕の文字が縁取りされます。<br>
                </label>
                <v-switch class="settings__item-switch" color="primary" id="always_border_caption_text" hide-details
                    v-model="settingsStore.settings.always_border_caption_text">
                </v-switch>
            </div>
            <div class="settings__item settings__item--switch">
                <label class="settings__item-heading" for="specify_caption_opacity">字幕の不透明度を指定する</label>
                <label class="settings__item-label" for="specify_caption_opacity">
                    オフのときは、字幕データから指定されている不透明度で描画します。<br>
                    とくに理由がなければ、オフにしておくのがおすすめです。<br>
                </label>
                <v-switch class="settings__item-switch" color="primary" id="specify_caption_opacity" hide-details
                    v-model="settingsStore.settings.specify_caption_opacity">
                </v-switch>
            </div>
            <div class="settings__item" :class="{'settings__item--disabled': settingsStore.settings.specify_caption_opacity === false}">
                <label class="settings__item-heading">字幕の不透明度</label>
                <label class="settings__item-label">
                    上の [字幕の不透明度を指定する] をオンに設定したときのみ有効です。不透明度を 0 に設定すれば、字幕の背景を非表示にできます。<br>
                </label>
                <div class="settings__item-label" ref="caption_opacity">
                    <v-slider class="settings__item-form" color="primary" show-ticks="always" thumb-label hide-details
                        :min="0" :max="1" :step="0.05" v-model="settingsStore.settings.caption_opacity"
                        :disabled="settingsStore.settings.specify_caption_opacity === false">
                    </v-slider>
                </div>
            </div>
            <div class="settings__item settings__item--switch">
                <label class="settings__item-heading" for="specify_caption_text_scale">字幕の文字サイズを指定する</label>
                <label class="settings__item-label" for="specify_caption_text_scale">
                    オフのときは、標準サイズ（1.0）で描画します。<br>
                    プロジェクターなど画面サイズが大きい場合に調整すると便利です。<br>
                </label>
                <v-switch class="settings__item-switch" color="primary" id="specify_caption_text_scale" hide-details
                    v-model="settingsStore.settings.specify_caption_text_scale">
                </v-switch>
            </div>
            <div class="settings__item" :class="{'settings__item--disabled': settingsStore.settings.specify_caption_text_scale === false}">
                <label class="settings__item-heading">字幕の文字サイズ</label>
                <label class="settings__item-label">
                    上の [字幕の文字サイズを指定する] をオンに設定したときのみ有効です。1.0 が標準サイズです。小さくしたい場合は 1.0 より小さい値、大きくしたい場合は 1.0 より大きい値を設定してください。<br>
                </label>
                <div class="settings__item-label">
                    <v-slider class="settings__item-form" color="primary" show-ticks="always" thumb-label hide-details
                        :min="0.3" :max="1.5" :step="0.1" v-model="settingsStore.settings.caption_text_scale"
                        :disabled="settingsStore.settings.specify_caption_text_scale === false">
                    </v-slider>
                </div>
            </div>
            <v-divider class="mt-6"></v-divider>
            <div class="settings__item settings__item--switch">
                <label class="settings__item-heading" for="tv_show_superimpose">テレビをみるときに文字スーパーを表示する</label>
                <label class="settings__item-label" for="tv_show_superimpose">
                    文字スーパーは、緊急地震速報の赤テロップや、NHK BS のニュース速報のテロップなどで利用されています。とくに理由がなければ、オンにしておくのがおすすめです。<br>
                </label>
                <v-switch class="settings__item-switch" color="primary" id="tv_show_superimpose" hide-details
                    v-model="settingsStore.settings.tv_show_superimpose">
                </v-switch>
            </div>
            <div class="settings__item settings__item--switch">
                <label class="settings__item-heading" for="video_show_superimpose">ビデオをみるときに文字スーパーを表示する</label>
                <label class="settings__item-label" for="video_show_superimpose">
                    文字スーパーは、緊急地震速報の赤テロップや、NHK BS のニュース速報のテロップなどで利用されています。録画当時の文字スーパーによるニュース速報を確認したい方以外は、オフにしておくのがおすすめです。<br>
                </label>
                <v-switch class="settings__item-switch" color="primary" id="video_show_superimpose" hide-details
                    v-model="settingsStore.settings.video_show_superimpose">
                </v-switch>
            </div>
        </div>
    </SettingsBase>
</template>
<script lang="ts">

import { mapStores } from 'pinia';
import { defineComponent } from 'vue';

import useSettingsStore from '@/stores/SettingsStore';
import Utils from '@/utils';
import SettingsBase from '@/views/Settings/Base.vue';

export default defineComponent({
    name: 'Settings-Caption',
    components: {
        SettingsBase,
    },
    data() {
        return {

            // フォームを小さくするかどうか
            is_form_dense: Utils.isSmartphoneHorizontal(),

            // 字幕のフォントの選択肢
            caption_font: [
                {title: 'Windows TV ゴシック', value: 'Windows TV Gothic'},
                {title: 'Windows TV 丸ゴシック', value: 'Windows TV MaruGothic'},
                {title: 'Windows TV 太丸ゴシック', value: 'Windows TV FutoMaruGothic'},
                {title: 'ヒラギノTV丸ゴ', value: 'Hiragino TV Sans Rd S'},
                {title: '新丸ゴ ARIB', value: 'TT-ShinMGo-regular'},
                {title: 'Rounded M+ 1m for ARIB', value: 'Rounded M+ 1m for ARIB'},
                {title: 'BIZ UDゴシック', value: 'BIZ UDGothic'},
                {title: 'Noto Sans JP', value: 'Noto Sans JP'},
                {title: '游ゴシック', value: 'Yu Gothic'},
                {title: 'デフォルトのフォント', value: 'sans-serif'},
            ],
        };
    },
    computed: {
        ...mapStores(useSettingsStore),

        // プレビューの字幕テキストに適用するフォント・縁取り・背景・文字サイズスタイル
        // PlayerController の DPlayer 初期化時 (aribb24 オプション) のロジックを CSS に置き換えて再現する
        // 文字サイズ倍率は、実描画が字幕の実描画中心を transform-origin にして「その場で拡大縮小」する挙動に合わせ、
        // テキスト要素自身を transform-origin: center でスケールすることで、サイズ変更時に位置がズレないようにする
        captionTextStyle(): Record<string, string> {
            const settings = this.settingsStore.settings;
            const style: Record<string, string> = {};

            // 文字サイズ倍率: specify_ フラグがオフのときはデフォルト値 (scale=1.0) を使用する
            const scale = settings.specify_caption_text_scale ? settings.caption_text_scale : 1.0;
            style.transform = `translateX(-50%) scale(${scale})`;
            style.transformOrigin = 'center';

            // フォント: PlayerController の normalFont と同じスタックを組み立てる
            let font = settings.caption_font;
            if (font === 'sans-serif') {
                style.fontFamily = 'sans-serif';
            } else {
                if (font === 'Yu Gothic') {
                    // 游ゴシックのみ、Windows と Mac で名前が異なる
                    font = 'Yu Gothic Medium","Yu Gothic","YuGothic';
                }
                style.fontFamily = `"${font}", "Rounded M+ 1m for ARIB", sans-serif`;
            }

            // 縁取り: always_border_caption_text がオンのとき、黒の text-shadow を多重がけして縁取りを再現する
            if (settings.always_border_caption_text === true) {
                style.textShadow = '1px 1px 1.5px #000, -1px 1px 1.5px #000, 1px -1px 1.5px #000, -1px -1px 1.5px #000';
            } else {
                style.textShadow = 'none';
            }

            // 背景 (不透明度): specify_caption_opacity がオンのときは指定値、オフのときは字幕データ依存で値不明のため
            // 見た目維持用に控えめなデフォルト背景 (rgba(0, 0, 0, 0.5)) を使う
            if (settings.specify_caption_opacity === true) {
                style.backgroundColor = `rgba(0, 0, 0, ${settings.caption_opacity})`;
            } else {
                style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }

            return style;
        },
    }
});

</script>
<style lang="scss" scoped>

.caption-preview {
    position: sticky !important;
    top: 65px;
    z-index: 4;
    // 共通の settings__item は position: relative; を持つため、sticky を明示的に優先する
    // 上側の余白は settings__content の既存 margin に任せ、字幕ページの見出し直下が間延びしないようにする
    margin-top: 0 !important;
    padding-top: 0px;
    padding-bottom: 16px;
    border-bottom: 2px solid rgb(var(--v-theme-background-lighten-2));
    background-color: rgb(var(--v-theme-background-lighten-1));
    box-shadow: 0px 10px 12px -14px rgb(0 0 0 / 45%);
    @include smartphone-horizontal {
        top: 0px;
        padding-top: 0px;
        padding-bottom: 12px;
    }
    @include smartphone-vertical {
        top: 60px;
        padding-top: 0px;
        padding-bottom: 12px;
        background-color: rgb(var(--v-theme-background));
    }

    .settings__item-label {
        @include smartphone-horizontal {
            margin-top: 6px;
        }
    }

    // 映像を模した字幕プレビュー画面
    &__screen {
        position: relative;
        width: 100%;
        max-width: 480px;
        margin-top: 12px;
        aspect-ratio: 16 / 9;
        border-radius: 6px;
        overflow: hidden;
        // 映像っぽさを出すための控えめなグラデーション背景
        background: linear-gradient(135deg, #2a3340 0%, #1a2028 60%, #10141a 100%);
        @include smartphone-horizontal {
            max-width: 320px;
            margin-top: 10px;
        }
        @include smartphone-vertical {
            margin-top: 10px;
        }
    }

    // 字幕レイヤー: 実描画の Canvas と同じくフルサイズに敷く (スケールはテキスト要素自身に適用する)
    &__layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    // 字幕テキスト: ARIB の自然表示位置 (画面下端から約 30%) に左右中央で配置する
    // font-family / text-shadow / background-color / transform (左右中央寄せ + 文字サイズ倍率のスケール) は
    // :style バインド (captionTextStyle) 側で指定する
    &__text {
        position: absolute;
        left: 50%;
        bottom: 30%;
        max-width: 92%;
        padding: 2px 6px;
        color: #ffffff;
        text-align: center;
        // 画面幅に応じて字幕サイズが変わるよう、ビューポート相対ではなく画面枠相対の単位を使いたいが、
        // CSS のみでは難しいため、視認しやすい固定サイズを基準とする (文字サイズ倍率は :style 側の scale で反映)
        font-size: 18px;
        font-weight: bold;
        line-height: 1.4;
        // 画面幅が狭いときに左右端で文字が見切れないよう、nowrap にはせず折り返しを許可する
        word-break: break-word;
        @include smartphone-horizontal {
            font-size: 14px;
        }
        @include smartphone-vertical {
            font-size: 14px;
        }
        @include smartphone-vertical-short {
            font-size: 13px;
        }
    }
}

</style>