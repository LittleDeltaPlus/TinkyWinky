//-------------- Start-Up ---------------
const fs = require('fs');
const {prefix, token} = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const randomEmoji = require('random-emoji');

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	console.log('Over the hills and far away, TellyTubbies come out to play!');
});

client.login(token);
//------------------------------------------

let qdReaction = null, playerList  = [], responses = [], czar, signUpAccessor, voted;
let gameFlags ={ started: false, roundStarted: false, activeChannel: null};
let responseMessage ;
//listen for messages
client.on('message', async message => {

	//DM Handler
	if(message.channel.type === "dm" && gameFlags.roundStarted && !message.author.bot && playerList.findIndex(player => player.id === message.author.id)!== -1){
		//if the player is part of the game
		if(playerList.findIndex(player => player.id === message.author.id)!== -1 &&
			//and the player hasnt given a response yet
			responses.findIndex(response => response.authorId === message.author.id) === -1 ){
			//add their response and assign an emoji
			//TODO: make sure only valid emojis are used
			responses.push({authorId: message.author.id, content: message.content, emoji: randomEmoji.random({count:1})[0].character})
		}
		//when all responses are received, start displaying them
		if (responses.length === playerList.length){
			await gameFlags.activeChannel.send(`all ${responses.length} received!`);
			//build the Embedded message to display the results
			responseMessage = new Discord.MessageEmbed().setTitle('Here are your answers');
			responseMessage.addField(responses[0].emoji, responses[0].content, false);

			//queue the proceed reaction
			qdReaction = `✅`;
			gameFlags.roundStarted = false;
			gameFlags.activeChannel.send(responseMessage);
		}
	}

//Reaction Handler
	//return if the message isn't a command
	if(qdReaction !== null && message.author.id === client.user.id){
		await message.react(qdReaction);

		//Handle HandsUp signup
		if (qdReaction === '\ud83d\ude4b'){
			qdReaction = null;
			//filter hands up messages
			const filter = (reaction, user) => {return reaction.emoji.name  ===  '\ud83d\ude4b'};
			const signUp = message.createReactionCollector(filter, { time: 15000 });
			//log added users
			signUp.on('collect', (reaction, user) => {
			if(user.id !== client.user.id && user.id !== czar.id){
				console.log(`added ${user.tag} to game list`);
				playerList.push({id: user.id, score: 0});
			}
			});
			//Export player list when finished/ready
			signUp.on('end', collected => {
				if (playerList.length <= 1){
					//you can't play by yourself
					message.channel.send(`Signup ended with no players, game cancelled.`);
				}else if( playerList.length >=24) {
					//too many players wont fit in one Embedded message
					message.channel.send(`Signup ended with 24+ players, game cancelled. I'm sorry there's just too many of you!`);
				} else {
					//start game
					console.log("game starting with:");
					playerList.forEach(user => console.log(`${user.tag} `));
					message.channel.send(`Great! Game starting with ${playerList.length} players.`);
					BeginRound();
				}
			});
			//Allow signUp to be stopped by an external command
			signUpAccessor = {
				end: function() {signUp.stop();}
			}
		}

		//Handle Response Readout
		if (qdReaction === '✅'){
			qdReaction = null;
			const filter = (reaction, user) => {
				return ['✅'].includes(reaction.emoji.name) && user.id === czar.id || user.id === client.user.id;
			};

			//watch the embedded message to know when to append answers
			const wait = message.createReactionCollector(filter, { time: 15000 });
			let i =1;
			//log added users
			wait.on('collect', async (reaction, user) => {
				if(user.id !== client.user.id && user.id === czar.id){
					//append response
					responseMessage.addField(responses[i].emoji, `${responses[i].content}`, false);
					i++;
					//reset ready reaction
					const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(czar.id));
					try {
						for (const reaction of userReactions.values()) {
							await reaction.users.remove(czar.id);
						}
					} catch (error) {
						console.error('Failed to remove reactions.');
					}
					//apply appeneded response
					message.edit(responseMessage).then(async () =>  {
						//if all answers have been displayed, start the voting
						if (i >= responses.length ) {
							//wait for proceed reactions to be cleared
							await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
							//add all response emojis in order of appearance
							let emojiList = responses.map( response => response.emoji);
							for (const emoji of emojiList) {
								try{
									await message.react(`${emoji}`)
								} catch (e) {
									console.error(e);
								}
							}
							//kill Listner
							wait.stop();
							CountScores(message);
						}
					});
				}
			});
		}
	}

//Command Handler
	//ignore messages that dont have the prefix, or aren't from this bot
	if (!message.content.startsWith(prefix) || message.author.bot&&!(message.author.id === client.user.id)) return;
	//split the message string into arguments
	const args = message.content.slice(prefix.length).split(/ +/);
	//remove the first argument (the command) and store it as a lowercase string
	const command = args.shift().toLowerCase();


//Commands
	//external Start command
	if(command === 'start' && !gameFlags.started){
		playerList = [];
		gameFlags.started = true;
		qdReaction = client.commands.get('start').execute(message, args);
		czar = message.author;
		console.log(`added ${czar.tag} to game list`);
		playerList.push({id: czar.id, score: 0 });
		gameFlags.activeChannel = message.channel;
	}
	//Elapse signUp's timer
	if(command === 'ready' && message.author.id === czar.id){
		signUpAccessor.end();
	}

	//Used for debugging rounds solo
	if(command === 'embed') {
		qdReaction = null;
		for (let i = 0; i < 9; i++) {
			responses.push({authorId: message.author.id, content: `${i}`, emoji: randomEmoji.random({count:1})[0].character})
		}
		responseMessage = new Discord.MessageEmbed().setTitle('Here are your answers');
		responseMessage.addField(responses[0].emoji, responses[0].content, true);
		message.channel.send(responseMessage);
		qdReaction = `✅`;
	}
});

function BeginRound() {
	//TODO: generate prompt
	playerList.forEach(user => client.users.cache.get(`${user.id}`).createDM());
	playerList.forEach(user => client.users.cache.get(`${user.id}`).send('prompt'));
	gameFlags.roundStarted = true;
}

async function CountScores(answerPost) {

	//signify users can vote
	await answerPost.channel.send(`begin voting!`);
	voted = [];

	//ctreate dynamic filter
	const filter = (reaction, user) => {
		if(voted.findIndex(voter => voter === user.id) === -1){
			//once a user has voted push their id to the filtered list
			voted.push(user.id);
			//ensure bot isn't registering own votes
			return user.id !== client.user.id;
		} else {
			return false;
		}
	};

	//listen to reaction votes.
	const signUp = answerPost.createReactionCollector(filter, { time: 15000 });
	signUp.on('collect', async (reaction, user) => {

	});
	//Export player list when finished/ready
	signUp.on('end', collected => {
		//collect votes into an array
		let votes = collected.array();
		console.log(`voting over`);
		//Find the max reaction (vote) count
		let winner = votes.reduce((prev, current) => (prev.count > current.count) ? prev : current);
		//See if there is a tie
		let matching = votes.filter(vote => vote.count === winner.count);

		//ToDo: Try-Throw-Catch
		if(matching.length === 1){
			try{
				//If one response wins find the winning response
				let WinningResponse = responses.findIndex(response=> response.emoji === winner.emoji.name);
				if(winningResponse === -1 ){
					throw "notFound";
				}
				//If the response is found, give the player a point
				playerList[playerList.findIndex(player => player.id === WinningResponse.authorId)].score +=1;
			} catch (e) {

			}
		} else {
			//if there are multiple responses store them
			let winningResponses =[];
			matching.forEach(winner => winningResponses.push(responses[responses.findIndex(response => response.emoji === winner.emoji.name)]));
			//award each winning player a point
			winningResponses.forEach(response => playerList[playerList.findIndex(player => player.id === response.authorId)].score +=1);
		}

		responses = [];
	});
}
//ToDo: StartNext