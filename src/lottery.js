class Lottery {
    // This could represent the lottery rules or any other details
    constructor(lottery, draw, startDate, stopDate, drawDate) {
        this.lottery = lottery;
        this.draw = draw;
        this.startDate = startDate;
        this.stopDate = stopDate;
        this.drawDate = drawDate;
    }
}

module.exports = Lottery;