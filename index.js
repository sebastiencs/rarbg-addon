const Stremio = require("stremio-addons");
const tapi = require("torrentapi-wrapper");
const magnet = require("magnet-uri");
const sprintf = require("voca/sprintf");
const tnp = require("torrent-name-parser");

const manifest = {
  "id": "org.stremio.rarbg",
  "version": "1.0.0",
  "types": ["movie", "series"],
  "filter": {
    "query.imdb_id": { "$exists": true },
    "query.type": { "$in":["series","movie"] },
    "sort.popularities.yts": { "$exists": true },
    "projection.imdb_id": { "$exists": true }
  },
  "idProperty": "imdb_id",
  "name": "RARBG addon",
  "description": "Watch from RARBG in Stremio",
  /* "icon": "URL to 256x256 monochrome png icon",
   * "background": "URL to 1366x756 png background",*/
};

const find_stream = ({ imdb_id, episode, season, type }, callback) => {
  const is_serie = type == 'series';

  tapi.search('stremio-addon', {
    query: is_serie ? sprintf("S%02sE%02s", season, episode) : undefined,
    imdb: imdb_id,
    sort: 'seeders',
    limit: 100,
    category: is_serie ? 'tv' : 'movies'
  }).then((results) => {

    return callback(null, results.map(({ download, seeders, title }) => {
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
    }));
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
    res.end()
  });
}).on("listening", () => {
  console.log("RARBG Stremio Addon listening on " + server.address().port);
}).listen(process.env.PORT || 7000);
