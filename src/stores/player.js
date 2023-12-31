import { reactive } from 'vue';
import { defineStore } from 'pinia';

import { getJsonPiped, getJsonHyp } from '@/scripts/fetch.js';
import { useStore, useMetadata, AMP } from '@/scripts/util.js';

const store = useStore();

export const useData = defineStore('data', () => {
  const state = reactive({
      title: '',
      description: '',
      artist: '',
      art: '',
      url: '',
      artistUrl: '',
      lyrics: '',
      src: [],
      urls: [],
    }),
    player = usePlayer();

  async function getSong(e) {
    const hash = new URLSearchParams(e.substring(e.indexOf('?'))).get('v'),
      json = await getJsonPiped('/streams/' + hash);

    state.art = json.thumbnailUrl.replace(AMP, '&');
    state.description = json.description;
    state.title = json.title.replace(AMP, '&');
    state.artist = json.uploader.replace(' - Topic', '').replace(AMP, '&');
    state.artistUrl = json.uploaderUrl;
    player.state.duration = json.duration;
    player.state.hls = json.hls;
    player.state.streams = json.audioStreams;
    state.url = e;

    await getNext(hash);
  }

  async function play(song) {
    if (song.offlineUri) {
      state.art = song.thumbnail;
      player.state.duration = song.duration;
      for (let i of ['title', 'artist', 'artistUrl', 'url']) state[i] = song[i];
      window.audioPlayer.load(song.offlineUri);
    } else await getSong(song.url);
  }

  async function getNext(hash) {
    if (
      store.getItem('next') !== 'false' &&
      (!state.urls ||
        state.urls.findIndex(s => s.url == state.url) < 0 ||
        state.urls.length == 1)
    ) {
      const json = await getJsonHyp('/next/' + hash);

      state.lyrics = json.lyricsId;

      state.url = json.songs[0]
        ? '/watch?v=' + json.songs[0].id
        : '/watch?v=' + hash;

      state.urls =
        json.songs.length > 0
          ? json.songs.map(i => ({
              ...i,
              ...{
                url: '/watch?v=' + i.id,
                id: undefined,
              },
            }))
          : state.urls;

      useMetadata(state.url, state.urls, {
        title: state.title,
        artist: state.artist,
        art: state.art,
      });
    } else {
      if (state.urls.length == 0) {
        state.urls = [
          {
            title: state.title,
            url: state.url,
          },
        ];
      }

      useMetadata(state.url, state.urls, {
        title: state.title,
        artist: state.artist,
        art: state.art,
      });
    }
  }

  function playNext(u) {
    const i = state.urls.findIndex(s => s.url === state.url);

    if (player.state.loop == 2) getSong(state.url);
    else if (
      state.urls.length > i &&
      state.urls.length != 0 &&
      state.urls[i + 1]
    )
      play(state.urls[i + 1]);
    else if (player.state.loop == 1) {
      state.url = state.urls[0].url;
      play(state.urls[0]);
    } else state.urls = [];
  }

  function prevTrack() {
    const i = state.urls.findIndex(s => s.url === state.url);

    if (state.urls[i - 1]) play(state.urls[i - 1]);
    else if (player.state.loop == 1) {
      state.url = state.urls[state.urls.length - 1].url;
      play(state.urls[state.urls.length - 1]);
    } else state.urls = [];
  }

  function nextTrack() {
    const i = state.urls.findIndex(s => s.url === state.url);

    if (state.urls[i + 1]) play(state.urls[i + 1]);
    else if (player.state.loop == 1) {
      state.url = state.urls[0].url;
      play(state.urls[0]);
    } else state.urls = [];
  }

  return { state, getSong, play, playNext, prevTrack, nextTrack };
});

export const usePlayer = defineStore('player', () => {
  const state = reactive({
    loop: 0,
    play: false,
    status: 'play',
    hls: '',
    streams: [],
    duration: 0,
    time: 0,
    realTime: 0,
    currentTime: 0,
    playlist: false,
    lyrics: false,
    info: false,
    add: false,
    vol: store.vol ? store.vol / 100 : 1,
  });

  function toggle(i) {
    if (typeof state[i] == 'boolean') state[i] = !state[i];
  }

  function setTime(t) {
    state.time = Math.floor((t / state.duration) * 100);
    state.realTime = Math.floor(t);
  }

  return { state, toggle, setTime };
});
