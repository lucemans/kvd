const f = require('microsoft-cognitiveservices-speech-sdk');
const player = require('node-aplay');
const path = require('path');
const fs = require('fs');
const redis = require('redis');
const streams = require('@lucemans/streams');
const { default: axios } = require('axios');
require('dotenv').config();

(async () => {

    const client = redis.createClient({ host: process.env.REDIS_HOST });
    const streamclient = new streams.GenericStream(client, 'kevin_speech');
    client.on('connect', async () => {
        console.log('connect');
        console.log('queue jobs');
        const f = await axios.get('https://official-joke-api.appspot.com/random_joke');
        console.log(f.data);

        if (f.data['setup'] && f.data['punchline']) {
            streamclient.queue(f.data.setup);
            streamclient.queue(f.data.punchline);
        }
    });
})();

// TODO: Add custom ALSA audio device for obs capture