import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

const JWT_SECRET = process.env["JWT_SECRET"] ?? "billiards-secret-key";

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;

  const user = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user[0]) {
    res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
    return;
  }

  const valid = await bcrypt.compare(password, user[0].password);
  if (!valid) {
    res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
    return;
  }

  const token = jwt.sign({ id: user[0].id, role: user[0].role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user[0];
  res.json({ token, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const { password: _pw, ...safeUser } = user[0];
    res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString() });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export { router as authRouter, JWT_SECRET };
