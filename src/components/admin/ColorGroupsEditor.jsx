// src/components/admin/ColorGroupsEditor.jsx
import * as React from "react";
import { Stack, Chip, TextField, Button, FormHelperText } from "@mui/material";
import axios from "axios";
import { baseUrl } from "../constant/constant";

export default function ColorGroupsEditor({ day, colors, onChange, adminKey }) {
  const [input, setInput] = React.useState("");
  const [err, setErr] = React.useState("");
  const addColor = async () => {
    const val = input.trim().toLowerCase();
    if (!val) {
      setErr("Enter a color name");
      return;
    }
    const exists = colors.some((c) => c.toLowerCase() === val);
    if (exists) {
      setErr("Group with same name already exists");
      return;
    }
    setErr("");
    onChange([...colors, val]);
    setInput("");
  };

  const removeColor = (c) => onChange(colors.filter((x) => x !== c));

  const save = async () => {
    await axios.post(
      `${baseUrl}/api/admin/settings/groups`,
      { day, colors },
      { headers: { "x-admin-key": adminKey } }
    );
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {colors.map((c) => (
          <Chip key={c} label={c} onDelete={() => removeColor(c)} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Add color"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button variant="outlined" onClick={addColor}>
          Add
        </Button>
        <Button variant="contained" onClick={save}>
          Save Colors
        </Button>
      </Stack>
      {!!err && <FormHelperText error>{err}</FormHelperText>}
    </Stack>
  );
}
