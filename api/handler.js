
import { lastWeekDate, oneWeekLater } from './date_helper.js';
import { getReport } from './response_time_report.js';

export default function handler(request, response) {
    if (request.query.key !== process.env.ACCESS_KEY) {
        response.status(401).json({
            error: 'Invalid key'
        });

        return;
    }

    const sinceDate = request.query.since ? new Date(request.query.since) : lastWeekDate();
    const untilDate =  request.query.until ? new Date(request.query.until) : oneWeekLater(sinceDate);

    getReport(sinceDate, untilDate, (data) => {
        response.status(200).json(data);
    });
}