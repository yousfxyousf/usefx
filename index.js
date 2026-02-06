// index.js - Discord Voice Bot for Discord.js v12 - MULTI-SERVER
require('dotenv').config();
const { Client } = require('discord.js');
const express = require('express');
const ytdl = require('ytdl-core');

// ==================== CONFIGURATION ====================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3000;

// SERVER 1: Join TWO voice channels
const SERVERS = [
  {
    guildId: '1468028186796491006',
    channelId: '1468046908860928224',
    name: 'Server 1'
  },
  {
    guildId: '1468028186796491006', 
    channelId: '1468046908860928224',
    name: 'Server 2'
  }
];

// ==================== GLOBAL STATE ====================
let currentStreamingStatus = 'I Got U';
const voiceConnections = new Map(); // Map: guildId -> { voiceConnection, audioDispatcher, isConnected }

// ==================== WEB SERVER ====================
const app = express();

// Helper function for web display
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function getBotStatusText() {
  return currentStreamingStatus;
}

function getConnectedServersCount() {
  let count = 0;
  for (const [guildId, data] of voiceConnections) {
    if (data.isConnected) count++;
  }
  return count;
}

app.get('/', (req, res) => {
  const connectedCount = getConnectedServersCount();
  const totalCount = SERVERS.length;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Multi-Server Discord Voice Bot</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 900px; 
          margin: 40px auto; 
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        .status {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        .connected { color: #4ade80; }
        .disconnected { color: #f87171; }
        .servers {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .server-card {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 8px;
          text-align: left;
        }
        .commands { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 10px; 
          margin-top: 20px;
        }
        .command {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 8px;
        }
        code {
          background: rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          display: inline-block;
          margin: 2px 0;
          word-break: break-all;
        }
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-online { background: #4ade80; }
        .status-offline { background: #f87171; }
      </style>
    </head>
    <body>
      <h1>🎵 Multi-Server Discord Voice Bot</h1>
      <div class="status">
        <p>🤖 Bot Status: <span class="status-indicator ${connectedCount > 0 ? 'status-online' : 'status-offline'}"></span> Connected to ${connectedCount}/${totalCount} servers</p>
        <p>🎮 Streaming Status: ${getBotStatusText()}</p>
        <p>⏰ Uptime: ${formatUptime(process.uptime())}</p>
        <p>📊 Node.js: ${process.version} | Discord.js v12</p>
      </div>
      
      <h2>🎯 Target Servers</h2>
      <div class="servers">
        ${SERVERS.map(server => {
          const serverData = voiceConnections.get(server.guildId);
          const isConnected = serverData ? serverData.isConnected : false;
          return `
          <div class="server-card">
            <h3>${server.name}</h3>
            <p><span class="status-indicator ${isConnected ? 'status-online' : 'status-offline'}"></span> ${isConnected ? 'Connected' : 'Disconnected'}</p>
            <p><strong>Server ID:</strong><br><code>${server.guildId}</code></p>
            <p><strong>Voice Channel ID:</strong><br><code>${server.channelId}</code></p>
            ${serverData && serverData.audioPlaying ? '<p>🎵 Audio Playing</p>' : ''}
          </div>
          `;
        }).join('')}
      </div>
      
      <h2>🎵 Commands</h2>
      <div class="commands">
        <div class="command">
          <h3>!join</h3>
          <p>Connect to all voice channels</p>
        </div>
        <div class="command">
          <h3>!leave</h3>
          <p>Leave all voice channels</p>
        </div>
        <div class="command">
          <h3>!play [server] [url]</h3>
          <p>Play audio in specific server (1 or 2)</p>
        </div>
        <div class="command">
          <h3>!stop [server]</h3>
          <p>Stop audio in specific server</p>
        </div>
        <div class="command">
          <h3>!status</h3>
          <p>Check bot status</p>
        </div>
        <div class="command">
          <h3>!help</h3>
          <p>Show help message</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  const connectedCount = getConnectedServersCount();
  res.json({ 
    status: 'healthy',
    servers_connected: connectedCount,
    total_servers: SERVERS.length,
    bot_status: getBotStatusText(),
    timestamp: new Date().toISOString(),
    node_version: process.version,
    discordjs_version: '12.5.3'
  });
});

app.get('/ping', (req, res) => {
  res.json({ 
    ping: 'pong', 
    time: Date.now(),
    uptime: process.uptime()
  });
});

const server = app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
  console.log(`🟢 Node.js version: ${process.version}`);
  console.log(`🤖 Using Discord.js v12`);
  console.log(`🎯 Targeting ${SERVERS.length} servers with auto-join`);
});

// ==================== DISCORD BOT ====================
const client = new Client();

// Command prefix
const PREFIX = '!';

// ==================== STREAMING STATUS FUNCTIONS ====================
function updateBotStatus() {
  if (!client.user) return;
  
  let activityName = 'I Got U';
  
  // Check if any server is playing audio
  let anyAudioPlaying = false;
  for (const [guildId, data] of voiceConnections) {
    if (data.audioPlaying) {
      anyAudioPlaying = true;
      break;
    }
  }
  
  // Check if any server is connected
  let anyConnected = false;
  for (const [guildId, data] of voiceConnections) {
    if (data.isConnected) {
      anyConnected = true;
      break;
    }
  }
  
  if (anyAudioPlaying) {
    activityName = 'I Got U';
    currentStreamingStatus = 'I Got U';
  } else if (anyConnected) {
    activityName = 'I Got U';
    currentStreamingStatus = 'I Got U';
  } else {
    activityName = 'I Got U';
    currentStreamingStatus = 'I Got U';
  }
  
  try {
    client.user.setActivity(activityName, { type: 'STREAMING', url: 'https://twitch.tv/discord' });
    console.log(`📊 Updated status: ${activityName}`);
  } catch (error) {
    console.log(`⚠️ Failed to update status: ${error.message}`);
  }
}

// ==================== VOICE FUNCTIONS ====================
async function connectToServer(server) {
  try {
    console.log(`🔗 Attempting to connect to ${server.name} (${server.guildId})...`);
    
    // Get the guild
    const guild = client.guilds.cache.get(server.guildId);
    if (!guild) {
      throw new Error(`Guild ${server.guildId} not found or bot not in server`);
    }
    
    // Get the channel
    const channel = guild.channels.cache.get(server.channelId);
    if (!channel) {
      throw new Error(`Channel ${server.channelId} not found in ${server.name}`);
    }
    
    // Check if it's a voice channel
    if (channel.type !== 'voice') {
      throw new Error(`Channel ${server.channelId} is not a voice channel in ${server.name}`);
    }
    
    // Join the voice channel
    const voiceConnection = await channel.join();
    
    // Set bot as deafened
    voiceConnection.voice.setSelfDeaf(true);
    
    console.log(`✅ Successfully connected to ${server.name}: ${channel.name}`);
    
    // Store connection data
    voiceConnections.set(server.guildId, {
      voiceConnection: voiceConnection,
      audioDispatcher: null,
      isConnected: true,
      audioPlaying: false,
      server: server
    });
    
    // Setup disconnect handler
    voiceConnection.on('disconnect', () => {
      console.log(`⚠️ Disconnected from ${server.name}`);
      const data = voiceConnections.get(server.guildId);
      if (data) {
        data.isConnected = false;
        data.audioPlaying = false;
      }
      updateBotStatus();
      
      // Attempt reconnect after delay
      setTimeout(() => {
        console.log(`🔄 Attempting to reconnect to ${server.name}...`);
        connectToServer(server);
      }, 10000);
    });
    
    updateBotStatus();
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to connect to ${server.name}: ${error.message}`);
    
    // Store as disconnected
    voiceConnections.set(server.guildId, {
      voiceConnection: null,
      audioDispatcher: null,
      isConnected: false,
      audioPlaying: false,
      server: server
    });
    
    updateBotStatus();
    
    // Retry after delay
    setTimeout(() => {
      console.log(`🔄 Retrying connection to ${server.name}...`);
      connectToServer(server);
    }, 15000);
    
    return false;
  }
}

async function connectToAllServers() {
  console.log(`🔄 Connecting to all ${SERVERS.length} servers...`);
  for (const server of SERVERS) {
    await connectToServer(server);
    // Add small delay between connections
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function disconnectFromAllServers() {
  console.log(`🔌 Disconnecting from all servers...`);
  for (const [guildId, data] of voiceConnections) {
    if (data.voiceConnection) {
      try {
        data.voiceConnection.disconnect();
        console.log(`✅ Disconnected from ${data.server.name}`);
      } catch (error) {
        console.log(`⚠️ Error disconnecting from ${data.server.name}: ${error.message}`);
      }
    }
  }
  voiceConnections.clear();
  updateBotStatus();
}

async function playYouTubeAudio(serverNumber, url) {
  const server = SERVERS[serverNumber - 1];
  if (!server) {
    throw new Error(`Server ${serverNumber} not found. Use 1 or 2.`);
  }
  
  const data = voiceConnections.get(server.guildId);
  if (!data || !data.isConnected || !data.voiceConnection) {
    throw new Error(`Not connected to ${server.name}. Use !join first.`);
  }
  
  try {
    // Validate URL
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Stop any currently playing audio in this server
    if (data.audioDispatcher) {
      data.audioDispatcher.end();
    }
    
    // Create stream
    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    });
    
    // Play audio
    const audioDispatcher = data.voiceConnection.play(stream, { 
      volume: 0.5,
      bitrate: 'auto'
    });
    
    data.audioDispatcher = audioDispatcher;
    data.audioPlaying = true;
    
    // Setup audio dispatcher events
    audioDispatcher.on('start', () => {
      console.log(`🎵 Audio playback started in ${server.name}`);
      updateBotStatus();
    });
    
    audioDispatcher.on('finish', () => {
      console.log(`✅ Audio playback finished in ${server.name}`);
      data.audioPlaying = false;
      data.audioDispatcher = null;
      updateBotStatus();
    });
    
    audioDispatcher.on('error', (error) => {
      console.error(`❌ Audio error in ${server.name}:`, error.message);
      data.audioPlaying = false;
      data.audioDispatcher = null;
      updateBotStatus();
    });
    
    // Get video info
    const info = await ytdl.getInfo(url).catch(() => ({ 
      videoDetails: { title: 'Unknown Title' } 
    }));
    return info.videoDetails.title;
    
  } catch (error) {
    throw new Error(`Failed to play audio in ${server.name}: ${error.message}`);
  }
}

function stopAudio(serverNumber) {
  const server = SERVERS[serverNumber - 1];
  if (!server) {
    throw new Error(`Server ${serverNumber} not found. Use 1 or 2.`);
  }
  
  const data = voiceConnections.get(server.guildId);
  if (data && data.audioDispatcher) {
    data.audioDispatcher.end();
    data.audioPlaying = false;
    data.audioDispatcher = null;
    updateBotStatus();
    return true;
  }
  return false;
}

// ==================== EVENT HANDLERS ====================
client.once('ready', () => {
  console.log(`✅ Bot ready: ${client.user.tag}`);
  console.log(`🎯 Targeting ${SERVERS.length} servers:`);
  SERVERS.forEach((server, index) => {
    console.log(`   ${index + 1}. ${server.name} - Guild: ${server.guildId}, Channel: ${server.channelId}`);
  });
  console.log(`📊 Prefix: ${PREFIX}`);
  
  // Set initial status
  updateBotStatus();
  
  // Update status periodically
  setInterval(updateBotStatus, 30000);
  
  // Attempt to connect to all servers
  setTimeout(() => {
    console.log('🔄 Attempting auto-connect to all servers...');
    connectToAllServers();
  }, 3000);
});

client.on('message', async message => {
  // Ignore bot messages and DMs
  if (message.author.bot || !message.guild) return;
  
  // Check for command prefix
  if (!message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  try {
    if (command === 'join') {
      const loadingMsg = await message.channel.send('🔄 Connecting to all servers...');
      await connectToAllServers();
      
      const connectedCount = getConnectedServersCount();
      await loadingMsg.edit(`✅ Connected to ${connectedCount}/${SERVERS.length} servers`);
    }
    
    else if (command === 'leave') {
      await disconnectFromAllServers();
      message.channel.send('✅ Disconnected from all servers');
    }
    
    else if (command === 'play') {
      if (args.length < 2) {
        return message.channel.send('❌ Usage: `!play [server] [youtube-url]`\nExample: `!play 1 https://youtube.com/...`');
      }
      
      const serverNum = parseInt(args[0]);
      const url = args[1];
      
      if (isNaN(serverNum) || serverNum < 1 || serverNum > SERVERS.length) {
        return message.channel.send(`❌ Invalid server number. Use 1-${SERVERS.length}`);
      }
      
      const loadingMsg = await message.channel.send(`⏳ Loading audio in Server ${serverNum}...`);
      
      try {
        const title = await playYouTubeAudio(serverNum, url);
        await loadingMsg.edit(`🎵 Now playing in Server ${serverNum}: **${title}**`);
      } catch (error) {
        console.error('Play error:', error.message);
        await loadingMsg.edit(`❌ ${error.message}`);
      }
    }
    
    else if (command === 'stop') {
      if (args.length < 1) {
        return message.channel.send('❌ Usage: `!stop [server]`\nExample: `!stop 1`');
      }
      
      const serverNum = parseInt(args[0]);
      
      if (isNaN(serverNum) || serverNum < 1 || serverNum > SERVERS.length) {
        return message.channel.send(`❌ Invalid server number. Use 1-${SERVERS.length}`);
      }
      
      const success = stopAudio(serverNum);
      message.channel.send(success ?
        `⏹️ Stopped audio in Server ${serverNum}` :
        `❌ No audio playing in Server ${serverNum}`
      );
    }
    
    else if (command === 'status') {
      const connectedCount = getConnectedServersCount();
      const statusEmbed = {
        color: connectedCount > 0 ? 0x00ff00 : 0xff0000,
        title: '🤖 Multi-Server Bot Status',
        description: `Connected to **${connectedCount}/${SERVERS.length}** servers`,
        fields: SERVERS.map((server, index) => {
          const data = voiceConnections.get(server.guildId);
          const isConnected = data ? data.isConnected : false;
          const audioPlaying = data ? data.audioPlaying : false;
          
          return {
            name: `Server ${index + 1}: ${server.name}`,
            value: `${isConnected ? '✅ Connected' : '❌ Disconnected'}\n` +
                   `${audioPlaying ? '🎵 Audio Playing' : '🔇 No Audio'}\n` +
                   `Channel: <#${server.channelId}>`,
            inline: true
          };
        }),
        timestamp: new Date(),
        footer: { text: 'Bot auto-joins multiple servers • All bots are deafened' }
      };
      
      message.channel.send({ embed: statusEmbed });
    }
    
    else if (command === 'help') {
      const helpEmbed = {
        color: 0x0099ff,
        title: '🎵 Multi-Server Bot Commands',
        description: `Prefix: \`${PREFIX}\`\nBot is configured to auto-join ${SERVERS.length} servers`,
        fields: [
          { name: '!join', value: 'Connect to all servers', inline: true },
          { name: '!leave', value: 'Disconnect from all servers', inline: true },
          { name: '!play [server] [url]', value: `Play YouTube audio in specific server (1-${SERVERS.length})`, inline: true },
          { name: '!stop [server]', value: `Stop audio in specific server (1-${SERVERS.length})`, inline: true },
          { name: '!status', value: 'Check bot status for all servers', inline: true },
          { name: '!help', value: 'Show this help message', inline: true }
        ],
        timestamp: new Date(),
        footer: { text: `Currently targeting ${SERVERS.length} servers` }
      };
      
      message.channel.send({ embed: helpEmbed });
    }
    
  } catch (error) {
    console.error(`Error handling command ${command}:`, error.message);
    message.channel.send('❌ An error occurred while processing your command.');
  }
});

client.on('error', error => {
  console.error('❌ Discord client error:', error.message);
});

// ==================== START BOT ====================
async function startBot() {
  try {
    if (!DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN is not set in environment variables');
    }
    
    console.log('🤖 Starting Multi-Server Discord bot (v12)...');
    await client.login(DISCORD_TOKEN);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    console.log('💡 Make sure:');
    console.log('1. DISCORD_TOKEN is set in .env file');
    console.log('2. Bot has been invited to BOTH servers');
    console.log('3. Bot has voice permissions in BOTH servers');
    process.exit(1);
  }
}

// ==================== KEEP-ALIVE FOR RENDER ====================
if (process.env.RENDER) {
  const https = require('https');
  const PING_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  // Ping every 4 minutes to keep Render awake
  setInterval(() => {
    https.get(`${PING_URL}/ping`, (res) => {
      console.log(`🔄 Keep-alive ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.log('⚠️ Keep-alive ping failed:', err.message);
    });
  }, 4 * 60 * 1000);
}

// ==================== GRACEFUL SHUTDOWN ====================


process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled promise rejection:', error.message);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught exception:', error.message);
});

// Start the bot
startBot();
