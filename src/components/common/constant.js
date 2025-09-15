import axios from "axios";

// when fetching content
const params = { day: currentDay, game: "quiz", uuid: user.uuid };
if (currentDay === "day2" || currentDay === "day3" || currentDay === "day4") {
  const color = localStorage.getItem(`ap_group_${currentDay}`);
  if (color) params.groupKey = color;
}
const res = await axios.get(`${baseUrl}/api/admin/game/content`, { params });
