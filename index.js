const Stremio = require("stremio-addons");
const tapi = require("torrentapi-wrapper");
const magnet = require("magnet-uri");
const tnp = require("torrent-name-parser");

const manifest = {
  "id": "org.stremio.rarbg",
  "version": "1.0.0",
  "types": ["movie", "series"],
  "filter": {
    "query.imdb_id": { "$exists": true },
    "query.type": { "$in":["series","movie"] }
  },
  "idProperty": "imdb_id",
  "name": "RARBG addon",
  "description": "Watch content from RARBG in Stremio",
  "endpoint": "https://rarbg-addon.chapu.is/stremioget/stremio/v1",
  /* "icon": "URL to 256x256 monochrome png icon",
   * "background": "URL to 1366x756 png background",*/
};

const find_stream = ({ imdb_id, episode, season, type }, callback) => {
  const is_serie = type == 'series';

  tapi.search('stremio-addon', {
    imdb: imdb_id,
    sort: 'seeders',
    limit: 100,
    category: is_serie ? 'tv' : 'movies'
  }).then((results) => {
    return callback(null, results.filter(({ episode_info }) => {
      return !is_serie || episode_info.epnum == episode && episode_info.seasonnum == season
    }).map(({ download, seeders, title }) => {
      const { infoHash, announce } = magnet.decode(download);
      const availability = seeders == 0 ? 0 : seeders < 5 ? 1 : 2;

      const { resolution = 'SD', quality, audio, group } = tnp(title);
      const detail = [ resolution, quality, audio, group ].filter(val => val).join(" - ");

      return {
 	infoHash,
        name: "RARBG",
        title: detail,
        isFree: true,
        sources: announce,
        availability
      };
    }).filter(elem => elem.availability > 0));
  }).catch((err) => {
    console.error(err);
    return callback(new Error("internal"));
  });
}

const addon = new Stremio.Server({
  "stream.find" : (args, callback, user) => {
    const { query } = args;
    if (!query) { return callback(); }
    return find_stream(query, callback);
  }
}, { stremioget: true }, manifest);

const server = require("http").createServer((req, res) => {
  addon.middleware(req, res, () => {
    res.end();
  });
}).on("listening", () => {
  console.log("RARBG Stremio Addon listening on " + server.address().port);
}).listen(process.env.PORT || 7000);
