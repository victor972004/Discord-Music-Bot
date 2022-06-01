const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require('ytdl-core');

const client = new Discord.Client();

const queue = new Map();


client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);
  const voiceChannel = message.member.voice.channel;

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return message.channel.send("KONO DIO DA!!!");;
  } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
  } else if (message.content.startsWith(`${prefix}queue`)) {
        showQueue(message, serverQueue);
        return;
  } else if (message.content.startsWith(`${prefix}quit`)){
        if (serverQueue.voiceChannel) {
            serverQueue.voiceChannel.leave();
            queue.delete(message.guild.id);
            return message.channel.send("Yare yare daze.");
        }
  } else if (message.content.startsWith(`${prefix}purge`)){
        purge(message, serverQueue);
        return;
  } else if (message.content.startsWith(`${prefix}delete`)){
        del(message, serverQueue);
        return;
  } else if (message.content.startsWith(`${prefix}shuffle`)){
        shuffle(message, serverQueue);
  } else {
    message.channel.send("MUDAMUDAMUDA!!! You need to enter a valid command!");
  }
});

//When play command execute
async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "MUDAMUDAMUDA!!! You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "MUDAMUDAMUDA!!! I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url 
  };

  let data = serverQueue

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`**${song.title}** has been added to the queue!`);
  }
}

//Skip function
function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "MUDAMUDAMUDA!!! You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("MUDAMUDAMUDA!!! There is no song that I could skip!");

  serverQueue.connection.dispatcher.emit("finish");
  return message.channel.send("Ho? Mukatte kuru no ka? Song skipped.");
}

//Stop function
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "MUDAMUDAMUDA!!! You have to be in a voice channel to stop the music!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

//Play fuction
function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    queue.delete(guild.id);
    return serverQueue.textChannel.send(
        "End of queue!"
      );
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, 
      {filter: "audioonly",
       highWaterMark: 1<<25
    }))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

//Display queue function
function showQueue(message, serverQueue){
    //If not in a channel
    if (!message.member.voice.channel)
        return message.channel.send(
        "MUDAMUDAMUDA!!! You have to be in a voice channel to stop the music!"
    );

    //If no songs in queue
    if (!serverQueue)
        return message.channel.send("MUDAMUDAMUDA!!! There are no songs in the queue!");
    
    //set variable
    let queue = serverQueue.songs;
    let resp = `__**Now Playing**__\n**${serverQueue.songs[0].title}**\n\n__**Queue**__\n`;

    //for loop to display queue
    for (var i = 1; i < queue.length; i++){
        resp += `${i}. **${serverQueue.songs[i].title}**\n`;
    }

    return message.channel.send(resp);
}

//Purge queue function
function purge(message, serverQueue){
  //If not in a channel
  if (!message.member.voice.channel)
    return message.channel.send(
    "MUDAMUDAMUDA!!! You have to be in a voice channel to stop the music!"
    );

//If no songs in queue
  if (!serverQueue)
   return message.channel.send("MUDAMUDAMUDA!!! There are no songs in the queue!");

   //Delete queue except for the song playing
  serverQueue.songs.splice(1);
  return message.channel.send("ROAD ROLLER DA!!! Queue purged.")
}

//Delete specific song from queue
function del(message, serverQueue){
  //If not in a channel
  if (!message.member.voice.channel)
    return message.channel.send(
    "MUDAMUDAMUDA!!! You have to be in a voice channel to stop the music!"
    );

  //If no songs in queue
  if (!serverQueue)
    return message.channel.send("MUDAMUDAMUDA!!! There are no songs in the queue!");

  //Declare variables.
  const args = message.content.split(" ");
  let songNum = args[1];
  
  //If not a number
  if (isNaN(songNum))
    return message.channel.send("MUDAMUDAMUDA!!! Input is not a number!");

  if (songNum < serverQueue.songs.length){
    removedSong = serverQueue.songs[songNum].title;
    serverQueue.songs.splice(songNum, 1);
    return message.channel.send(`Ho? Mukatte kuru no ka? \n**${removedSong}** deleted.`);
  }

  else
    return message.channel.send("MUDAMUDAMUDA!!! Number is not within the queue!");
}

function shuffle(message, serverQueue){
  //If not in a channel
  if (!message.member.voice.channel)
    return message.channel.send(
    "MUDAMUDAMUDA!!! You have to be in a voice channel to stop the music!"
    );

  //If no songs in queue
  if (!serverQueue)
    return message.channel.send("MUDAMUDAMUDA!!! There are no songs in the queue!");

  //Shuffle queue
  if (serverQueue.songs.length > 1)
    for (let i = serverQueue.songs.length - 1; i > 1; --i){
      const j = 1 + Math.floor(Math.random() * i);
      [serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]];
    }
    message.channel.send("ORAORAORA!!! Queue shuffled!\n");
    showQueue(message, serverQueue);
    return;
}

client.login(token);