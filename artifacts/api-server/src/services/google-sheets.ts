import { google } from "googleapis";
import { logger } from "../lib/logger";

function getAuth() {
  const raw = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export interface SessionRow {
  date: string;
  tableName: string;
  tableType: string;
  openedByName: string;
  closedByName: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  pricePerHour: number;
  amount: number | null;
}

const HEADER = [
  "Ngày",
  "Tên Bàn",
  "Loại Bàn",
  "Nhân viên mở",
  "Nhân viên đóng",
  "Giờ mở",
  "Giờ đóng",
  "Thời gian (phút)",
  "Giá/giờ (đ)",
  "Tiền (đ)",
];

export async function appendSessionToSheet(sheetId: string, session: SessionRow): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Ensure header row exists
  const meta = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A1:A1",
  });

  if (!meta.data.values || meta.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] },
    });
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const row = [
    session.date,
    session.tableName,
    session.tableType,
    session.openedByName,
    session.closedByName ?? "",
    formatTime(session.startTime),
    formatTime(session.endTime),
    session.durationMinutes ?? "",
    session.pricePerHour,
    session.amount ?? "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  logger.info({ sheetId, table: session.tableName }, "Session synced to Google Sheets");
}
