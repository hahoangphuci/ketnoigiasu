import express from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const ROOT = path.resolve();
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const files = {
  users: path.join(DATA_DIR, "users.json"),
  tutors: path.join(DATA_DIR, "tutors.json"),
  sessions: path.join(DATA_DIR, "sessions.json"),
  reviews: path.join(DATA_DIR, "reviews.json"),
};

for (const f of Object.values(files)) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, "[]");
}

app.use(express.json());
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

function readJSON(file) {
  try {
    let raw = fs.readFileSync(file, "utf8");
    // Remove BOM if present
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("Error reading JSON:", file, e.message);
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// Auth routes
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing fields" });
  }
  const users = readJSON(files.users);
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ message: "Email exists" });
  }
  const id = uuidv4();
  const hashed = bcrypt.hashSync(password, 10);
  const user = { id, name, email, password: hashed, role };
  users.push(user);
  writeJSON(files.users, users);
  const token = jwt.sign({ id, role, name }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ id, name, email, role });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const users = readJSON(files.users);
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const users = readJSON(files.users);
  const me = users.find((u) => u.id === req.user.id);
  if (!me) {
    res.clearCookie("token");
    return res.status(401).json({ message: "User not found" });
  }
  res.json({ id: me.id, name: me.name, email: me.email, role: me.role });
});

// Tutor profile routes
app.post("/api/tutors", authMiddleware, (req, res) => {
  if (req.user.role !== "tutor")
    return res.status(403).json({ message: "Only tutors" });
  const { subject, bio, pricePerHour, availableTimes, location } = req.body;
  if (!subject || !pricePerHour)
    return res.status(400).json({ message: "Missing fields" });
  const tutors = readJSON(files.tutors);
  const existing = tutors.find(
    (t) =>
      t.tutorId === req.user.id &&
      t.subject.toLowerCase() === subject.toLowerCase()
  );
  if (existing)
    return res
      .status(409)
      .json({ message: "Bạn đã có hồ sơ môn này rồi", profile: existing });
  const profile = {
    id: uuidv4(),
    tutorId: req.user.id,
    subject,
    bio: bio || "",
    location: location || "",
    pricePerHour: Number(pricePerHour),
    availableTimes: Array.isArray(availableTimes) ? availableTimes : [],
    rating: 0,
    ratingCount: 0,
  };
  tutors.push(profile);
  writeJSON(files.tutors, tutors);
  res.json(profile);
});

app.put("/api/tutors/:id", authMiddleware, (req, res) => {
  const tutors = readJSON(files.tutors);
  const idx = tutors.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });
  if (tutors[idx].tutorId !== req.user.id)
    return res.status(403).json({ message: "Not owner" });
  const patch = req.body;
  tutors[idx] = {
    ...tutors[idx],
    ...patch,
    pricePerHour: Number(patch.pricePerHour ?? tutors[idx].pricePerHour),
  };
  writeJSON(files.tutors, tutors);
  res.json(tutors[idx]);
});

// Xóa hồ sơ gia sư
app.delete("/api/tutors/:id", authMiddleware, (req, res) => {
  const tutors = readJSON(files.tutors);
  const idx = tutors.findIndex((t) => t.id === req.params.id);
  if (idx === -1)
    return res.status(404).json({ message: "Không tìm thấy hồ sơ" });
  if (tutors[idx].tutorId !== req.user.id)
    return res
      .status(403)
      .json({ message: "Bạn không có quyền xóa hồ sơ này" });

  // Kiểm tra có buổi học đang chờ không
  const sessions = readJSON(files.sessions);
  const pendingSessions = sessions.filter(
    (s) => s.profileId === req.params.id && !s.completed
  );
  if (pendingSessions.length > 0) {
    return res.status(400).json({
      message: `Không thể xóa! Còn ${pendingSessions.length} buổi học chưa hoàn thành`,
    });
  }

  const deleted = tutors.splice(idx, 1)[0];
  writeJSON(files.tutors, tutors);
  res.json({ message: "Đã xóa hồ sơ thành công", profile: deleted });
});

app.get("/api/tutors", (req, res) => {
  const {
    subject,
    minPrice,
    maxPrice,
    time,
    ratingMin,
    location,
    page = 1,
    limit = 6,
  } = req.query;
  let tutors = readJSON(files.tutors);
  const users = readJSON(files.users);

  if (subject)
    tutors = tutors.filter((t) =>
      t.subject.toLowerCase().includes(String(subject).toLowerCase())
    );
  if (location)
    tutors = tutors.filter((t) =>
      (t.location || "").toLowerCase().includes(String(location).toLowerCase())
    );
  if (minPrice)
    tutors = tutors.filter((t) => t.pricePerHour >= Number(minPrice));
  if (maxPrice)
    tutors = tutors.filter((t) => t.pricePerHour <= Number(maxPrice));
  if (time)
    tutors = tutors.filter((t) => (t.availableTimes || []).includes(time));
  if (ratingMin) tutors = tutors.filter((t) => t.rating >= Number(ratingMin));

  // Add tutor name from users
  tutors = tutors.map((t) => {
    const tutor = users.find((u) => u.id === t.tutorId);
    return { ...t, tutorName: tutor ? tutor.name : "Gia sư" };
  });

  // Pagination
  const total = tutors.length;
  const totalPages = Math.ceil(total / Number(limit));
  const currentPage = Math.max(1, Math.min(Number(page), totalPages || 1));
  const start = (currentPage - 1) * Number(limit);
  const paginatedTutors = tutors.slice(start, start + Number(limit));

  res.json({
    tutors: paginatedTutors,
    pagination: {
      total,
      totalPages,
      currentPage,
      limit: Number(limit),
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    },
  });
});

// Booking routes
app.post("/api/sessions", authMiddleware, (req, res) => {
  if (req.user.role !== "student")
    return res.status(403).json({ message: "Only students" });
  const { tutorId, profileId, dateTime, duration } = req.body;
  if (!tutorId || !dateTime || !duration)
    return res.status(400).json({ message: "Missing fields" });
  const tutors = readJSON(files.tutors);
  const profile =
    tutors.find((t) => t.id === profileId) ||
    tutors.find((t) => t.tutorId === tutorId);
  if (!profile)
    return res.status(404).json({ message: "Tutor profile not found" });
  const sessions = readJSON(files.sessions);
  const session = {
    id: uuidv4(),
    tutorId,
    studentId: req.user.id,
    profileId: profile.id,
    dateTime,
    duration: Number(duration),
    price: profile.pricePerHour * Number(duration),
    status: "pending",
    createdAt: new Date().toISOString(),
    paid: false,
    completed: false,
  };
  sessions.push(session);
  writeJSON(files.sessions, sessions);
  res.json(session);
});

app.get("/api/sessions/mine", authMiddleware, (req, res) => {
  const sessions = readJSON(files.sessions);
  const mine = sessions.filter(
    (s) => s.studentId === req.user.id || s.tutorId === req.user.id
  );
  res.json(mine);
});

app.post("/api/payments/mock", authMiddleware, (req, res) => {
  const { sessionId } = req.body;
  const sessions = readJSON(files.sessions);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return res.status(404).json({ message: "Session not found" });
  if (sessions[idx].studentId !== req.user.id)
    return res.status(403).json({ message: "Only student can pay" });
  sessions[idx].paid = true;
  sessions[idx].status = "paid";
  writeJSON(files.sessions, sessions);
  res.json({ message: "Payment successful (mock)", session: sessions[idx] });
});

// Mark session complete (simple)
app.post("/api/sessions/:id/complete", authMiddleware, (req, res) => {
  const sessions = readJSON(files.sessions);
  const idx = sessions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Session not found" });
  const isTutor = sessions[idx].tutorId === req.user.id;
  if (!isTutor)
    return res.status(403).json({ message: "Only tutor can complete" });
  sessions[idx].completed = true;
  sessions[idx].status = "completed";
  writeJSON(files.sessions, sessions);
  res.json(sessions[idx]);
});

// Reviews
app.post("/api/reviews", authMiddleware, (req, res) => {
  const { sessionId, rating, comment } = req.body;
  const sessions = readJSON(files.sessions);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.studentId !== req.user.id)
    return res.status(403).json({ message: "Only student can review" });
  if (!session.completed)
    return res.status(400).json({ message: "Session not completed" });
  const reviews = readJSON(files.reviews);
  const review = {
    id: uuidv4(),
    tutorId: session.tutorId,
    studentId: req.user.id,
    sessionId,
    rating: Number(rating),
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };
  reviews.push(review);
  writeJSON(files.reviews, reviews);
  // Update tutor rating
  const tutors = readJSON(files.tutors);
  const idx = tutors.findIndex((t) => t.tutorId === session.tutorId);
  if (idx !== -1) {
    const tutorReviews = reviews.filter((r) => r.tutorId === session.tutorId);
    const avg =
      tutorReviews.reduce((a, r) => a + r.rating, 0) / tutorReviews.length;
    tutors[idx].rating = Number(avg.toFixed(2));
    tutors[idx].ratingCount = tutorReviews.length;
    writeJSON(files.tutors, tutors);
  }
  res.json(review);
});

app.get("/api/reviews/:tutorId", (req, res) => {
  const reviews = readJSON(files.reviews);
  const users = readJSON(files.users);
  const tutorReviews = reviews
    .filter((r) => r.tutorId === req.params.tutorId)
    .map((r) => {
      const student = users.find((u) => u.id === r.studentId);
      return { ...r, studentName: student ? student.name : "Ẩn danh" };
    });
  res.json(tutorReviews);
});

// Get tutor detail with user info
app.get("/api/tutors/:id/detail", (req, res) => {
  const tutors = readJSON(files.tutors);
  const users = readJSON(files.users);
  const reviews = readJSON(files.reviews);
  const profile = tutors.find((t) => t.id === req.params.id);
  if (!profile) return res.status(404).json({ message: "Not found" });
  const tutor = users.find((u) => u.id === profile.tutorId);
  const tutorReviews = reviews
    .filter((r) => r.tutorId === profile.tutorId)
    .map((r) => {
      const student = users.find((u) => u.id === r.studentId);
      return { ...r, studentName: student ? student.name : "Ẩn danh" };
    });
  res.json({
    ...profile,
    tutorName: tutor ? tutor.name : "Unknown",
    tutorEmail: tutor ? tutor.email : "",
    reviews: tutorReviews,
  });
});

// Get my tutor profiles
app.get("/api/tutors/my/profiles", authMiddleware, (req, res) => {
  const tutors = readJSON(files.tutors);
  const myProfiles = tutors.filter((t) => t.tutorId === req.user.id);
  res.json(myProfiles);
});

// Dashboard stats
app.get("/api/stats", authMiddleware, (req, res) => {
  const sessions = readJSON(files.sessions);
  const reviews = readJSON(files.reviews);
  const tutors = readJSON(files.tutors);

  if (req.user.role === "student") {
    const mySessions = sessions.filter((s) => s.studentId === req.user.id);
    const completed = mySessions.filter((s) => s.completed).length;
    const totalSpent = mySessions
      .filter((s) => s.paid)
      .reduce((a, s) => a + s.price, 0);
    res.json({
      totalSessions: mySessions.length,
      completed,
      totalSpent,
      role: "student",
    });
  } else {
    const mySessions = sessions.filter((s) => s.tutorId === req.user.id);
    const completed = mySessions.filter((s) => s.completed).length;
    const totalEarned = mySessions
      .filter((s) => s.paid)
      .reduce((a, s) => a + s.price, 0);
    const myProfiles = tutors.filter((t) => t.tutorId === req.user.id);
    const myReviews = reviews.filter((r) => r.tutorId === req.user.id);
    const avgRating = myReviews.length
      ? (
          myReviews.reduce((a, r) => a + r.rating, 0) / myReviews.length
        ).toFixed(1)
      : 0;
    res.json({
      totalSessions: mySessions.length,
      completed,
      totalEarned,
      totalProfiles: myProfiles.length,
      avgRating,
      totalReviews: myReviews.length,
      role: "tutor",
    });
  }
});

// Get sessions with user names
app.get("/api/sessions/mine/detailed", authMiddleware, (req, res) => {
  const sessions = readJSON(files.sessions);
  const users = readJSON(files.users);
  const tutors = readJSON(files.tutors);
  const mine = sessions
    .filter((s) => s.studentId === req.user.id || s.tutorId === req.user.id)
    .map((s) => {
      const tutor = users.find((u) => u.id === s.tutorId);
      const student = users.find((u) => u.id === s.studentId);
      const profile = tutors.find((t) => t.id === s.profileId);
      return {
        ...s,
        tutorName: tutor ? tutor.name : "Unknown",
        studentName: student ? student.name : "Unknown",
        subject: profile ? profile.subject : "Unknown",
      };
    });
  res.json(mine);
});

// Fallback to index.html for SPA-like routing
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
