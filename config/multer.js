import multer from "multer";
import path from "path";
import fs from "fs";

const dir = "uploads/products";
fs.mkdirSync(dir, { recursive: true });

// disk storage for simple local usage
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

export const upload = multer({ storage });
