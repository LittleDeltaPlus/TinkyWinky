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
	//Find the game that the message belongs to
	const game = findGame(message);

	//Try processing it as a DM
	HandleDM(message, game).catch(err => console.error(err));

	//Command Handler
	//ignore messages that dont have the prefix, or aren't from this bot
	if (!message.content.startsWith(prefix) || message.author.bot && !(message.author.id === client.user.id) || message.channel.type === 'dm') return;
	//split the message string into arguments
	const args = message.content.slice(prefix.length).split(/ +/);
	//remove the first argument (the command) and store it as a lowercase string
	const command = args.shift().toLowerCase();
	// Collect them and pass these to the handler
	const argumentJSON = { message: message, arguments: args, game: game };

	await ExecuteCommand(command, argumentJSON);

});

async function ExecuteCommand(command, JSON) {
	client.commands.get(`${command}`).execute(JSON).then(newGame => {
		if(newGame === null) {
			if(JSON.game) {
				JSON.game.end();
				instances.splice(instances.indexOf(instance => instance.activeChannel = JSON.game.activeChannel), 1);
			}
		}
		else if(newGame) {
			instances.push(newGame);
			newGame.client = client;
		}
	})
		.catch(err => {console.error(err); JSON.message.channel.send(`Command not found, try ${prefix}help for a list of commands`);});
}

async function HandleDM(message, game) {
	if(game === null || !game.roundStarted || message.channel.type !== 'dm' || message.author.bot) return;
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
	let game;
	if(gameIndex === -1) {
		return null;
	}
	else {
		game = instances[gameIndex];
		//If it's marked for destruction don't bother passing it back.
		if(game.selfDesctruct) {
			instances.splice(instances.indexOf(instance => instance.activeChannel === game.activeChannel), 1);
			return null;
		}
		return game;
	}

}
