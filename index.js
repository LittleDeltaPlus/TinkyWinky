//-------------- Requires ---------------
const fs = require('fs');
const { prefix, token } = require('./config.json');
const prompts = require('./assets/prompts.json');
const validEmoji = require('./assets/emoji.json');
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
let playerList = [], responses = [], czar, signUpAccessor, voted, assignedEmoji = [];
const gameVars = { started: false, roundStarted: false, activeChannel: null, currentPrompt: null }, prevPrompts = [];
let responseMessage;

//-------------- Message Handler ---------------
client.on('message', async message => {

	//DM Handler
	if(message.channel.type === 'dm' && gameVars.roundStarted && !message.author.bot &&
		playerList.findIndex(player => player.id === message.author.id) !== -1) {
		HandleDM(message).catch(err => console.error(err));
	}

	//Command Handler
	//ignore messages that dont have the prefix, or aren't from this bot
	if (!message.content.startsWith(prefix) || message.author.bot && !(message.author.id === client.user.id) || message.channel.type === 'dm') return;
	//split the message string into arguments
	const args = message.content.slice(prefix.length).split(/ +/);
	//remove the first argument (the command) and store it as a lowercase string
	const command = args.shift().toLowerCase();

	//**Commands**
	//Start Game command
	if(command === 'start' && !gameVars.started) {
		//Prep game variables
		gameVars.started = true;
		gameVars.activeChannel = message.channel;
		playerList = [];
		//Note starting User (they're obviously playing)
		czar = message.author;
		//enable Signup Handler
		message.reply(' wants to start a game, react to this message with a \ud83d\ude4b to be included!').then(async sentMessage => {
			HandleSignup(sentMessage).then(list => {
				playerList = list;
				BeginRound();
			});
		}).catch(err => console.error(err));
	}
	//Elapse signUp's timer
	if(command === 'ready' && message.author.id === czar.id) {
		signUpAccessor.end();
	}
	//Let's players Join Late
	if(command === 'join') {
		if(gameVars.started === true) {
			if(gameVars.roundStarted === true) {
				client.users.cache.get(`${message.author.id}`).createDM().catch(err => console.error(err));
				client.users.cache.get(`${message.author.id}`).send(`${gameVars.currentPrompt}`).catch(err => console.error(err));
			}
			await playerList.push({ id: message.author.id, score: 0 });
		}
		else {
			message.reply(`, sorry there's no games running at the minute. use the command ${prefix}start to start one!`)
				.catch(err => console.error(err));
		}
	}
	//remove a player from the game
	if(command === 'kick') {
		if(gameVars.started === true) {
			for (const user of args) {
				user.replace('@!', '');
				KickUser(message, user);
			}
		}
		else {
			message.reply(`, sorry there's no games running at the minute. use the command ${prefix}start to start one!`)
				.catch(err => console.error(err));
		}
	}
	if(command === 'end' && message.author.id === czar.id) {
		endGame();
	}
	//Displays available commands
	if(command === 'help') {
		const helpMessage = new Discord.MessageEmbed().setTitle('Hi there, I\'m TinkyWinky! Here are some commands to get you started!');
		helpMessage.addField('Game Commands',
			`**${prefix}start** - starts a game
			**${prefix}ready** - starts a game immediately if everyone is in
			**${prefix}join** - lets you join an ongoing game for the next round
			**${prefix}kick @user** - starts a vote to remove a player from the game`,
			false);
		await message.channel.send(helpMessage);
	}
});

// A function that reads the collected responses one at a time, waiting for user input
async function readResponses(message) {
	message.react('✅').then(function() {
		const filter = (reaction, user) => {
			return ['✅'].includes(reaction.emoji.name) && user.id === czar.id || user.id === client.user.id;
		};
		//watch the embedded message to know when to append answers
		const wait = message.createReactionCollector(filter, { dispose: true });
		let i = 1;
		//log added users
		wait.on('collect', async (reaction, user) => {
			if(user.id !== client.user.id && user.id === czar.id) {
				//append response
				responseMessage.addField(responses[i].emoji, `${responses[i].content}`, false);
				i++;
				//reset ready reaction
				const userReactions = message.reactions.cache.filter(readyReaction => readyReaction.users.cache.has(czar.id));
				try {
					for (const removingReaction of userReactions.values()) {
						await removingReaction.users.remove(czar.id);
					}
				}
				catch (error) {
					console.error('Failed to remove reactions.');
				}
				//apply appended response
				message.edit(responseMessage).then(async function() {
					//if all answers have been displayed, start the voting
					if (i >= responses.length) {
						//wait for proceed reactions to be cleared
						await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
						//add all response emojis in order of appearance
						const emojiList = responses.map(response => response.emoji);
						for (const emoji of emojiList) {
							try{
								await message.react(`${emoji}`);
							}
							catch (e) {
								console.error(e);
							}
						}
						//kill Listener
						wait.stop();
						CountScores(message).catch(err => console.error(err));
					}
				});
			}
		});
	});
}

function KickUser(message, userID) {
	const toKick = client.users.cache.get(`${userID}`);
	message.channel.send(`${message.author} wants to kick ${toKick} those in favour, react with \ud83d\ude4b`).then(async sentMessage => {
		await sentMessage.react('\ud83d\ude4b');
		HeadCount('\ud83d\ude4b', sentMessage).then(collected => {
			if(Math.floor(playerList.length / 2) + 1 <= collected.length) {
				message.channel.send('majority rules in favour, kicking').catch(e => console.error(e));
				try {
					playerList.splice(playerList.indexOf(player => player.id === userID), 1);
				}
				catch (e) {
					console.error(e);
				}
			}
			else {
				message.channel.send('majority rules in favour, kicking').catch(e => console.error(e));
			}
		});
	});
}

async function HandleDM(message) {
	//if the player is part of the game
	if(playerList.findIndex(player => player.id === message.author.id) !== -1 &&
		//and the player hasn't given a response yet
		responses.findIndex(response => response.authorId === message.author.id) === -1) {
		//add their response and assign an emoji
		responses.push({ authorId: message.author.id, content: message.content, emoji: validEmoji[GetRand(validEmoji, assignedEmoji)].emoji });
	}
	//when all responses are received, start displaying them
	if (responses.length === playerList.length) {
		gameVars.roundStarted = false;
		await gameVars.activeChannel.send(`all ${responses.length} received!`);
		//build the Embedded message to display the results
		responseMessage = new Discord.MessageEmbed().setTitle(`Here are your answers to: "${gameVars.currentPrompt}"`);
		responseMessage.addField(responses[0].emoji, responses[0].content, false);
		gameVars.activeChannel.send(responseMessage).then(async sentMessage => {
			//reset Emoji Catalogue
			assignedEmoji = [];
			//read the rest of the responses
			readResponses(sentMessage).catch(err => console.error(err));
		});
	}
}

async function HandleSignup(message) {
	return new Promise(resolve => {
		message.react('\ud83d\ude4b').then(function() {
		//filter hands up messages
			HeadCount('\ud83d\ude4b', message).then(collectedUsers => {
				const tempList = [];
				for(const user of collectedUsers) {
					tempList.push({ id: user.id, score: 0 });
				}
				if(tempList.findIndex(player => player.id === czar.id) === -1) {
					tempList.push({ id: czar.id, score: 0 });
				}
				if (tempList.length <= 1) {
					//you can't play by yourself
					message.channel.send('Signup ended with one player, game cancelled.').catch(err => console.error(err));
				}
				else if (tempList.length >= 24) {
					//too many players wont fit in one Embedded message
					message.channel.send('Signup ended with 24+ players, game cancelled. I\'m sorry there\'s just too many of you!').catch(err => console.error(err));
				}
				else {
					//start game
					console.log(`game starting with: ${tempList.length} players`);
					message.channel.send(`Great! Game starting with ${tempList.length} players.`).catch(err => console.error(err));
					resolve(tempList);
				}
			});
		});
	});
}


function HeadCount(focusedEmoji, message) {
	return new Promise(function(resolve) {
		const filter = (reaction) => {return reaction.emoji.name === focusedEmoji;};
		const signUp = message.createReactionCollector(filter, { time: 30000 });
		//Export player list when finished/ready
		signUp.on('end', collected => {
			const collectedUsers = collected.array()[0].users.cache.array();
			collectedUsers.splice(collectedUsers.findIndex(user => user.id === client.user.id), 1);
			resolve(collectedUsers);
		});
		//Allow signUp to be stopped by an external command
		signUpAccessor = {
			end: function() {
				signUp.stop();
			},
		};
	});
}

function GetRand(catalogue, previous) {
	//If all numbers have been used reset.
	if (previous.length === catalogue.length) {
		previous.splice(0, previous.length);
	}
	//Generate random number
	const rand = Math.floor((Math.random() * catalogue.length) + 1);
	//If this hasn't been used before, return it
	if(previous.findIndex(id => id === rand) === -1) {
		previous.push(rand);
		return rand;
	}
	//else generate new number
	return GetRand();
}

function BeginRound() {
	//get a random prompt ID that hasn't been used yet
	const promptID = GetRand(prompts, prevPrompts);
	gameVars.currentPrompt = prompts[promptID].Prompt;
	//Create a DM to all current players
	playerList.forEach(user => client.users.cache.get(`${user.id}`).createDM());
	playerList.forEach(user => client.users.cache.get(`${user.id}`).send(`${gameVars.currentPrompt}`));
	gameVars.activeChannel.send(`Your Next prompt is:  **${gameVars.currentPrompt}**`);
	//Enable DM handler
	gameVars.roundStarted = true;
}

async function CountScores(answerPost) {
	//signify users can vote
	await answerPost.channel.send('begin voting!');
	voted = [];

	//create dynamic filter
	const filter = (reaction, user) => {
		if(voted.findIndex(voter => voter === user.id) === -1) {
			//once a user has voted push their id to the filtered list
			voted.push(user.id);
			//ensure bot isn't registering own votes
			return user.id !== client.user.id;
		}
		else {
			return false;
		}
	};

	//listen to reaction votes.
	const voting = answerPost.createReactionCollector(filter, { time: 15000 });
	//Export player list when finished/ready
	voting.on('end', async collected => {
		//collect votes into an array
		const votes = collected.array();
		if(votes.length === 0) {
			return;
		}
		//Find the max reaction (vote) count
		const winningJoke = votes.reduce((prev, current) => (prev.count > current.count) ? prev : current);
		//See if there is a tie
		const matching = votes.filter(vote => vote.count === winningJoke.count);
		if(matching.length === 1) {
			try{
				//If one response wins find the winning response
				const WinningResponse = responses[responses.findIndex(response=> response.emoji === winningJoke.emoji.name)];
				//If the response is found, give the player a point
				const winnerIndex = playerList.findIndex(player => player.id === WinningResponse.authorId);
				playerList[winnerIndex].score += 1;
				czar = client.users.cache.get(`${playerList[winnerIndex].id}`);
				gameVars.activeChannel.send(`the winner with ${winningJoke.count - 1} votes is... ${czar}, their current score is: ${playerList[winnerIndex].score}!`);
				console.log(`${czar.tag} gained a point, giving them ${playerList[winnerIndex].score}`);
			}
			catch (e) {
				console.log(e);
			}
		}
		else {
			try{
				//if there are multiple responses store them
				const winningResponses = [];
				const coWinners = [];
				matching.forEach(coWinner => winningResponses.push(responses[responses.findIndex(response => response.emoji === coWinner.emoji.name)]));
				//award each winning player a point
				winningResponses.forEach(response => {
					const winnerInd = playerList.findIndex(player => player.id === response.authorId);
					playerList[winnerInd].score += 1;
					coWinners.push(playerList[winnerInd]);
				});
				gameVars.activeChannel.send('The winners of this round are...');
				for (const coWinner of coWinners) {
					gameVars.activeChannel.send(`${client.users.cache.get(coWinner.id)} with a score of ${coWinner.score}`);
				}
				czar = client.users.cache.get(`${coWinners[0].id}`);
			}
			catch (e) {
				console.log(e);
			}
		}
		const victors = playerList.filter(player => player.score >= 10);
		if (victors.length !== 0) {
			endGame();
		}
		responses = [];
		await gameVars.activeChannel.send('starting a new round, keep an eye on those DMs');
		await Sleep(5000);
		return BeginRound();
	});
}
function Sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function endGame() {
	//Find the max reaction (vote) count
	const winner = playerList.reduce((prev, current) => (prev.score > current.score) ? prev : current);
	//See if there is a tie
	const matching = playerList.filter(player => player.score === winner.score);
	if(matching.length === 1) {
		gameVars.activeChannel.send(`Congratulations! ${client.users.cache.get(matching[0].id)} has proven they are the funniest!`);
		gameVars.started = false;
	}
	if(matching.length > 1) {
		for (const coWinner of matching) {
			gameVars.activeChannel.send(`${client.users.cache.get(coWinner.id)} have proven they are joint funniest!`);
		}
		gameVars.activeChannel.send(`each with a score of ${matching[0].score}`).catch(err => console.error(err));
		gameVars.started = false;
	}
}