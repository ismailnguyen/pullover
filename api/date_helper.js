function getLastWeekDate() {
    var lastWeek = new Date(new Date().getTime() - 60 * 60 * 24 * 7 * 1000);
    lastWeek.setHours(0, 0, 0, 0);
    var diffToMonday = lastWeek.getDate() - lastWeek.getDay() + (lastWeek.getDay() === 0 ? -6 : 1);
    return new Date(lastWeek.setDate(diffToMonday));
}

module.exports = {
    lastWeekDate: getLastWeekDate
};