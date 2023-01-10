
import { lastWeek } from "date_helper.js";
import { getReport } from "response_time_report.js";

export default function handler(request, response) {
    getReport(lastWeek(), (data) => {
        response.status(200).json({
            body: data
        });
    });
}