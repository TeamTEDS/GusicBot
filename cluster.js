require("dotenv").config();
const { Client } = require('discord-cross-hosting');
const Cluster = require('discord-hybrid-sharding');

const client = new Client({
    agent: 'bot',
    host: 'localhost', // Domain without https
    port: 4444, // Proxy Connection (Replit) needs Port 443
    // handshake: true, When Replit or any other Proxy is used
    authToken: process.env.AUTH_TOKEN,
    rollingRestarts: false, // Enable, when bot should respawn when cluster list changes.
});
client.on('debug', console.log);
client.connect();

const manager = new Cluster.ClusterManager(`${__dirname}/bot.js`, { 
    totalShards: 'auto', // or numeric shard count
    /// Check below for more options
    shardsPerClusters: 2, // 2 shards per process
    // totalClusters: 7,
    mode: 'process', // you can also choose "worker"
    token: process.env.BOT_TOKEN, 
});
manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
manager.on('debug', console.log);

manager.extend(
    new Cluster.HeartbeatManager({
        interval: 2000, // Interval to send a heartbeat
        maxMissedHeartbeats: 5, // Maximum amount of missed Heartbeats until Cluster will get respawned
    })
)

client.listen(manager);
client
    .requestShardData()
    .then(e => {
        if (!e) return;
        if (!e.shardList) return;
        manager.totalShards = e.totalShards;
        manager.totalClusters = e.shardList.length;
        manager.shardList = e.shardList;
        manager.clusterList = e.clusterList;
        manager.spawn({ timeout: -1 });
    })
    .catch(e => console.log(e));