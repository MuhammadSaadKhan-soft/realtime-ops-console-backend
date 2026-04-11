const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const resourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  return "raw";
};

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const { orgId, ticketId } = req.params;

    return {
      folder: `attachments/${orgId}/${ticketId}`,
      use_filename: true,
      unique_filename: true,
      resource_type: resourceType(file.mimetype),
      type: "private",
    };
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 5,
  },
});

module.exports = upload;