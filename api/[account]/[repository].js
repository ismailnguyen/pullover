import { lastWeekDate, oneWeekLater } from '../date_helper.js';
import { getReport } from '../response_time_report.js';

export default function handler(request, response) {
    if (!request.headers.authorization) {
        response.status(401).json({
            error: 'Missing authentication client id and/or secret'
        });

        return;
    }

    if (!request.query.account) {
        response.status(400).json({
            error: 'Missing account parameter'
        });

        return;
    }

    if (!request.query.repository) {
        response.status(400).json({
            error: 'Missing repository parameter'
        });

        return;
    }

    const sinceDate = request.query.since ? new Date(request.query.since) : lastWeekDate();
    const untilDate =  request.query.until ? new Date(request.query.until) : oneWeekLater(sinceDate);

    getReport(
        request.headers.authorization,
        request.query.account,
        request.query.repository,
        sinceDate,
        untilDate,
        (data) => {
        response.status(200).json(data);
    });
}