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
            <div class="settings__item settings__item--switch">
                <label class="settings__item-heading" for="specify_caption_vertical_position">字幕の縦位置を指定する</label>
                <label class="settings__item-label" for="specify_caption_vertical_position">
                    オフのときは、字幕の通常表示位置（30）で描画します。<br>
                    文字サイズの変更した際に、字幕の位置を上下に調整したい場合に便利です。<br>
                </label>
                <v-switch class="settings__item-switch" color="primary" id="specify_caption_vertical_position" hide-details
                    v-model="settingsStore.settings.specify_caption_vertical_position">
                </v-switch>
            </div>
            <div class="settings__item" :class="{'settings__item--disabled': settingsStore.settings.specify_caption_vertical_position === false}">
                <label class="settings__item-heading">字幕の縦位置</label>
                <label class="settings__item-label">
                    上の [字幕の縦位置を指定する] をオンに設定したときのみ有効です。0 が画面下端、100 が画面上端で、値を大きくするほど上方向に移動します。初期値の 30 が字幕の通常表示位置です。<br>
                </label>
                <div class="settings__item-label">
                    <v-slider class="settings__item-form" color="primary" show-ticks="always" thumb-label hide-details
                        :min="0" :max="100" :step="10" v-model="settingsStore.settings.caption_vertical_position_offset"
                        :disabled="settingsStore.settings.specify_caption_vertical_position === false">
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
    }
});

</script>