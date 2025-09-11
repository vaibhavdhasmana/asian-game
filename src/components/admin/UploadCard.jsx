// src/components/admin/UploadCard.jsx
import * as React from "react";
import { Paper, Stack, Typography, Button, Chip } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import axios from "axios";
import { baseUrl } from "../constant/constant";

export default function UploadCard({
  title,
  day,
  game,
  groupKey = "default",
  slot,
  adminKey,
  adminUuid,
  onDone,
}) {
  const inputRef = React.useRef(null);
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");

  const pick = () => inputRef.current?.click();

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const url = `${baseUrl}/api/admin/content/upload?day=${day}&game=${game}${groupKey ? `&group=${groupKey}` : ""}${slot ? `&slot=${slot}` : ""}`;
      const headers = adminUuid
        ? { "x-admin-uuid": adminUuid }
        : { "x-admin-key": adminKey };
      const res = await axios.post(url, fd, { headers });
      setStatus(`Uploaded v${res.data?.version || "?"}`);
      onDone?.();
      setFile(null);
    } catch (e) {
      setStatus(e.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography fontWeight={800}>{title}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip size="small" label={`Day: ${day}`} />
          <Chip size="small" label={`Game: ${game}`} />
          <Chip size="small" label={`Group: ${groupKey}`} />
          {slot ? <Chip size="small" label={`Slot: ${slot}`} /> : null}
        </Stack>
        <input
          ref={inputRef}
          type="file"
          accept={game === 'jigsaw' ? 'image/*,.json' : '.csv,.json'}
          hidden
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<UploadFileIcon />}
            variant="outlined"
            onClick={pick}
          >
            {game === 'jigsaw' ? 'Choose Image/JSON' : 'Choose CSV/JSON'}
          </Button>
          <Button
            disabled={!file || loading}
            variant="contained"
            onClick={upload}
          >
            Upload
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {file ? file.name : "No file selected"}
        </Typography>
        {status && <Typography variant="body2">{status}</Typography>}
      </Stack>
    </Paper>
  );
}
