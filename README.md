# Kevin Voice Daemon (KVD)

This is a repository belonging to the kevin project. It is used to manage the voice of kevin. With the current setup of this project you should be able to run the `kvd` inside of a simple container and potentially even in an orchestrated environment.

## How it works (simplified)

- Await Job
- Check if job has been cached
- If cached use cache
- If not cached get file from azure
- Play file
- Repeat

## In more detail

KVD uses a `redis` database and the `@lucemans/streams` spec to receive jobs over the redis connection.
Once a jobs are placed in the stream they will be executed in order.

For each job in the stream kvd checks if it has already been processed before by looking inside of the cache.
The cache for this specific implementation of `kvd` is stored in `s3` (specifically `minio`). If a specific message is not found inside of the cache it will reach out to the `azure voice` api to request a `.wav` file for the respective text input.
Once this file is received it is temporarily stored in the local `./audio` directory, played, and then offloaded onto the `S3` storage server. This is done to prevent pods from hoarding disk space or memory.
Another main advantage of storing cached files inside of `S3` is that it allows you to easily control how and where your files are stored, potentially even on a different machine, or a multitude of machines depending on your configuration.

After the file has been cached every "similar" job that gets introduced in the future will now use the file that is in the cache instead of requesting a new one. This does not only `save time` but also `save funds` as `azure` charges per character.

## Configuration

Most configuration is loaded directly from the `.env` file if supplied but otherwise from the system's ENV. Here are some of the parameters you can set.

`.env` file should look something like

```env
TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
REDIS_HOST=localhost
BUCKET_NAME=mybucket
S3_URL=localhost
S3_PORT=9000
S3_USERNAME=notanadmin
S3_PASSWORD=s3cur3p4ssw0rd
VOICE=en-GB-RyanNeural
```

## Whats `queue.js` ?

If you were to happen to run through this repository and find this file, well then you are in **luc**k. After you have spun up your server, give this command a try

```
node ./src/queue.js
```

If everything goes according to plan you should be listening to a lovely random joke. (Credits for the [Joke API](https://github.com/15Dkatz/official_joke_api))