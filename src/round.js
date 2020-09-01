const prompts = require('../assets/prompts.json');
const validEmoji = require('../assets/emoji.json');
const Discord = require('discord.js');
class Round {
	constructor(prevPrompts) {
		this.assignedEmoji = [];
		this.responses = [];
		this.voted = [];
		this.started = true;
		this.answerPost = null;
		//get a random prompt ID that hasn't been used yet
		const promptID = GetRand(prompts, prevPrompts);
		this.currentPrompt = prompts[promptID].Prompt;
	}

	readResponses(message, czar) {
		return new Promise(resolve => {
			const responseMessage = this.answerPost;
			const responses = this.responses;
			message.react('✅').then(function() {
				const filter = (reaction, user) => {
					return ['✅'].includes(reaction.emoji.name) && user.id === czar.id || user.id === Discord.client.user.id;
				};
				//watch the embedded message to know when to append answers
				const wait = message.createReactionCollector(filter, { dispose: true });
				let responseIterator = 1;
				//log added users
				wait.on('collect', async (reaction, user) => {
					if(user.id !== Discord.client.user.id && user.id === czar.id) {
						//append response
						responseMessage.addField(this.responses[responseIterator].emoji, `${this.responses[responseIterator].content}`, false);
						responseIterator++;
						//reset ready reaction
						const userReactions = message.reactions.cache.filter(readyReaction => readyReaction.users.cache.has(czar.id));
						for (const removingReaction of userReactions.values()) {
							await removingReaction.users.remove(czar.id).catch(function() { console.error('failed to remove reactions'); });
						}
						//apply appended response
						message.edit(responseMessage).then(async function() {
							//if all answers have been displayed, start the voting
							if (responseIterator >= responses.length) {
								//wait for proceed reactions to be cleared
								await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
								//add all response emojis in order of appearance
								const emojiList = responses.map(response => response.emoji);
								for (const emoji of emojiList) {
									await message.react(`${emoji}`).catch(err => console.error(err));
								}
								//kill Listener
								wait.stop();
								resolve();
							}
						});
					}
				});
			});
		});
	}

	addResponse(message) {
		return new Promise(resolve => {
			this.responses.push({
				authorId: message.author.id,
				content: message.content,
				emoji: validEmoji[GetRand(validEmoji, this.assignedEmoji)].emoji,
			});
			resolve(this.responses.length);
		});
	}

	Score(playerList) {
		return new Promise(resolve => {
			const readOut = this.answerPost;
			//signify users can vote
			readOut.channel.send('begin voting!').then(function() {
				this.voted = [];

				//create dynamic filter
				const filter = (reaction, user) => {
					if(this.voted.findIndex(voter => voter === user.id) === -1) {
						//once a user has voted push their id to the filtered list
						this.voted.push(user.id);
						//ensure bot isn't registering own votes
						return user.id !== Discord.client.user.id;
					}
					else {
						return false;
					}
				};
				//listen to reaction votes.
				const voting = readOut.answerPost.createReactionCollector(filter, { time: 15000 });
				//Export player list when finished/ready
				voting.on('end', async collected => {
					//collect votes into an array
					const votes = collected.array();
					//Find the max reaction (vote) count
					const winningJoke = votes.reduce((prev, current) => (prev.count > current.count) ? prev : current);
					//See if there is a tie
					const matching = votes.filter(vote => vote.count === winningJoke.count);
					const winningResponses = [], winnerIndexes = [];
					matching.forEach(coWinner => winningResponses.push(this.responses[this.responses.findIndex(response => response.emoji === coWinner.emoji.name)]));
					winningResponses.forEach(response => {winnerIndexes.push(playerList.indexOf(player => player.id === response.authorId));});
					resolve(winnerIndexes, winningJoke.count);
				});
			});
		});
	}
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

module.exports = Round;