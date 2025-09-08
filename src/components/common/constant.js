import axios from "axios";

// when fetching content
// const params = { day: currentDay, game: "quiz", uuid: user.uuid };
// if (currentDay === "day2" || currentDay === "day3") {
//   const color = localStorage.getItem(`ap_group_${currentDay}`);
//   if (color) params.groupKey = color;
// }
// const res = await axios.get(`${baseUrl}/api/admin/game/content`, { params });



// Where you load game content for Day 2 / Day 3:

const color = localStorage.getItem("ap_group_color") || "";
const params = { day, game: "quiz", uuid: user.uuid };
if (day === "day2" || day === "day3") {
  if (color) params.groupKey = color; // optional; server will use saved too
}
const res = await axios.get(`${baseUrl}/api/admin/game/content`, { params });