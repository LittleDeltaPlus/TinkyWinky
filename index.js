//-------------- Requires ---------------
const fs = require('fs');
const { prefix, token } = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

//-------------- Start-Up ---------------
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

//-------------- Ready ---------------
client.once('ready', () => {
	console.log('Over the hills and far away, TellyTubbies come out to play!');
});

client.login(token).catch(err => console.error(err));

//-------------- Global Variables ---------------
const instances = [];
//-------------- Message Handler ---------------
client.on('message', async message => {
	let game = findGame(message);

	if(game !== null && game.selfDesctruct) {
		instances.splice(instances.indexOf(instance => instance.activeChannel === game.activeChannel), 1);
		game = null;
	}
	//DM Handler
	if(game !== null && game.roundStarted && message.channel.type === 'dm' && !message.author.bot) {
		HandleDM(message).catch(err => console.error(err));
	}

	//Command Handler
	//ignore messages that dont have the prefix, or aren't from this bot
	if (!message.content.startsWith(prefix) || message.author.bot && !(message.author.id === client.user.id) || message.channel.type === 'dm') return;
	//split the message string into arguments
	const args = message.content.slice(prefix.length).split(/ +/);
	//remove the first argument (the command) and store it as a lowercase string
	const command = args.shift().toLowerCase();
	// Pass these to the handler
	client.commands.get(`${command}`).execute(message, args, game).then(newGame => {
		if(newGame === null) {
			if(game) {
				game.end();
				instances.splice(instances.indexOf(instance => instance.activeChannel = game.activeChannel), 1);
			}
		}
		else if(newGame) {
			instances.push(newGame);
			newGame.client = client;
			//newGame.playerList.splice(newGame.playerList.indexOf(user => user.id === client.user.id), 1);

		}
	})
		.catch(err => {console.error(err); message.channel.send(`Command not found, try ${prefix}help for a list of commands`);});

});

async function HandleDM(message, game) {
	//if the player is part of the game
	if(game.playerList.findIndex(player => player.id === message.author.id) !== -1 &&
		//and the player hasn't given a response yet
		game.currentRound.responses.findIndex(response => response.authorId === message.author.id) === -1) {
		//add their response and assign an emoji
		game.addResponse(message);
	}
}


function findGame(message) {
	const gameIndex = instances.map(instance => {return instance.activeChannel;}).indexOf(message.channel);
	if(gameIndex === -1) {
		return null;
	}
	else {
		return instances[gameIndex];
	}
}
