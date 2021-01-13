const f = require('microsoft-cognitiveservices-speech-sdk');
const player = require('node-aplay');
const path = require('path');
const fs = require('fs');
const redis = require('redis');
const streams = require('@lucemans/streams');
const minio = require('minio');
const { LogState } = require('./log');
require('dotenv').config();

var minioClient = new minio.Client({
    endPoint: process.env.S3_URL,
    port: +process.env.S3_PORT,
    useSSL: false,
    accessKey: process.env.S3_USERNAME,
    secretKey: process.env.S3_PASSWORD
});

async function generate_audio(speech, filename) {
    return new Promise((resolve, reject) => {
        const speechConfig = f.SpeechConfig.fromSubscription(process.env.TOKEN, 'westeurope');
        speechConfig.speechSynthesisVoiceName = 'en-GB-RyanNeural';
        const audioConfig = f.AudioConfig.fromAudioFileOutput(path.join(__dirname, "../audio/" + filename));
        const synthesizer = new f.SpeechSynthesizer(speechConfig, audioConfig);
        synthesizer.speakTextAsync(
            speech,
            async result => {
                if (result) {
                    console.log(JSON.stringify(result));
                }
                synthesizer.close();
                resolve();
            },
            error => {
                console.log(error);
                synthesizer.close();
                reject();
            });
    });
}

async function talk(speech) {
    return new Promise(async (resolve,) => {
        const log = new LogState();

        try {
            log.msg = speech;
            const filename = speech.replace(/\s/g, '-').toLowerCase().split('').filter(e => (e.match(/[a-z0-9\.\!\?\,\;\""]/))).join('') + '.wav';

            log.exists.start();
            const exists = await new Promise((resolve, reject) => {
                const list = minioClient.listObjectsV2(process.env.BUCKET_NAME, filename);
                let existed = false;
                list.on('data', (data) => {
                    if (data['name']) {
                        if (data['name'] === filename) {
                            existed = true;
                            resolve(true);
                        }
                    }
                });
                list.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
                list.on('end', () => {
                    if (!existed) {
                        resolve(false);
                    }
                });
            });
            log.exists.stop();

            if (!exists) {
                log.download.start();
                await generate_audio(speech, filename);
                log.download.stop();

                var metaData = {
                    // 'Content-Type': 'application/octet-stream',
                    // 'X-Amz-Meta-Testing': 1234,
                    // 'example': 5678
                }
                log.upload.start();
                await minioClient.fPutObject(process.env.BUCKET_NAME, filename, path.join(__dirname, '../audio/' + filename), metaData);
                log.upload.stop();
            }

            if (exists) {
                log.download.start();
                await minioClient.fGetObject(process.env.BUCKET_NAME, filename, path.join(__dirname, '../audio/' + filename));
                log.download.stop();
            }

            const music = new player(path.join(__dirname, "../audio/" + filename));

            log.play.start();
            music.play();
            await new Promise((resolve,) => { music.on('complete', resolve); });
            log.play.stop();

            log.delete.start();
            await new Promise((resolve,) => { fs.rm(path.join(__dirname, '../audio/' + filename), resolve); });
            log.delete.stop();

        } finally {
            console.log(log.toString());
            console.log(JSON.stringify(log));
            resolve();
        }
    });
}

(async () => {

    const exists = await minioClient.bucketExists(process.env.BUCKET_NAME);
    if (!exists) {
        await minioClient.makeBucket(process.env.BUCKET_NAME);
    }

    const client = redis.createClient({ host: process.env.REDIS_HOST });
    const streamclient = new streams.GenericStream(client, 'kevin_speech');
    client.on('connect', async () => {
        console.log('REDIS | Connected');
        while (client.connected) {
            console.log('JOB | Ready for next job');
            const job = await streamclient.next();
            console.log('Speech |  ', job[1]);
            await talk(job[1]);
        }
    });
})();