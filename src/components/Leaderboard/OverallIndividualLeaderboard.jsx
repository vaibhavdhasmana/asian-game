import * as React from "react";
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  Divider,
  Skeleton,
  Typography,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import useLeaderboard from "../../hooks/useLeaderBoard";
import Podium from "./Podium";

const initials = (name = "", uuid = "") => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1)
    return parts[0][0]?.toUpperCase() || uuid.slice(0, 2).toUpperCase();
  return uuid.slice(0, 2).toUpperCase();
};

export default function OverallIndividualLeaderboard() {
  const { user } = useAuth();
  const { rows, loading, error } = useLeaderboard({
    scope: "overall",
    limit: 100,
  });

  const sortedRows = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    return copy;
  }, [rows]);

  const myRank = React.useMemo(() => {
    const idx = sortedRows.findIndex((r) => r.uuid === user?.uuid);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedRows, user]);

  return (
    <>
      {loading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
            gap: 2,
            mb: 2,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} />
          ))}
        </Box>
      ) : (
        <Podium top3={sortedRows.slice(0, 3)} />
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 2,
          maxHeight: { xs: 360, sm: 420 },
          overflow: "auto",
        }}
      >
        {loading ? (
          <Box sx={{ p: 2, display: "grid", gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Box>
        ) : (
          <List dense>
            {sortedRows.slice(3).map((r, idx) => {
              const rank = idx + 4;
              const isMe = r.uuid === user?.uuid;
              return (
                <React.Fragment key={`${r.uuid}-${rank}`}>
                  <ListItem
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: isMe ? "warning.light" : "transparent",
                    }}
                    secondaryAction={
                      <Chip
                        label={`${r.total} pts`}
                        color={isMe ? "warning" : "default"}
                        sx={{ fontWeight: 700 }}
                      />
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ fontWeight: 700 }}>
                        {initials(r.name, r.uuid)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: { xs: "13px", md: "18px" },
                            fontWeight: 600,
                          }}
                        >
                          #{rank} {r.name || r.uuid}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {r.uuid}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              );
            })}
            {sortedRows.length <= 3 && (
              <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
                {error ? "Couldn’t load leaderboard." : "Not enough data yet."}
              </Box>
            )}
          </List>
        )}
      </Paper>

      {!loading && myRank && (
        <Box sx={{ mt: 1.5 }}>
          <Chip
            color="info"
            variant="outlined"
            label={`Your position : #${myRank}`}
            sx={{ fontWeight: 800 }}
          />
        </Box>
      )}
    </>
  );
}
