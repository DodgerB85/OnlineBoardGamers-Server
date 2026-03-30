/**
	Class representing an FCM player
	@class
	@param {string} name
	@param {number} colour
*/
Player = function (n, c, i, d) {
	this.name = n;
	this.originalName = n;
	this.colour = c;
	this.factory = new Factory();
	// ADD IN PLAYER CARDS - remove disallowed ones later
	this.playerCards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
	this.gantt = 0;
	this.money = 0;
	this.arrayPos = i;
	//this.autoplay = false;
	this.displayName = d;
};

Player.import = function (tab) {
	var p = new Player(0, 0, 0);
	if (tab != undefined && tab.length > 0) {
		p.factory = Factory.import(tab[0]);
		p.name = tab[1];
		p.colour = tab[2];
		p.playerCards = tab[3];
		p.gantt = tab[4];
		p.money = tab[5];
		p.arrayPos = tab[6];
		if (tab[7] === 1) p.autoplay = true;
		else p.autoplay = false;
		if (tab[8] != undefined) p.originalName = tab[8];
		else p.originalName = p.name;
		if (tab[8] != undefined) p.displayName = tab[9];
		else p.displayName = undefined;
	}
	return p;
};

Player.prototype.export = function () {
	var res = [];

	// 0
	res.push(this.factory.export());

	// 1
	res.push(this.name);

	// 2
	res.push(this.colour);

	// 3
	res.push(this.playerCards);

	// 4
	res.push(this.gantt);

	// 5
	res.push(this.money);

	// 6
	res.push(this.arrayPos);

	// 7
	if (this.autoplay === true) res.push(1);
	else res.push(0);

	// 8
	res.push(this.originalName);

	// 9
	res.push(this.displayName);

	return res;
};
















