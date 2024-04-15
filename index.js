require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const cors = require("cors");

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(cors());

server.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  socket.on("message", (data) => {
    console.log(data);
    io.emit("receive-message", data);
  });

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`User joined room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});
app.get("/", (req, res) => {
  res.status(200).json("Hello This is webhook setup for whatsapp.");
});
app.get("/msg", (req, res) => {
  io.emit("receive-message", {
    from: "7742148739",
    msg_body: "hello from Glitch Server!!",
  });
  res.status(200).json("Hello This is webhook setup for whatsapp.");
});

// to verify the callback url from dashboard side - cloud api side
// ...existing code...

// to verify the callback url from dashboard side - cloud api side
app.get("/:company_id/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let challenge = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];
  let company_id = req.params.company_id;

  // Use the company_id to fetch the corresponding SECRET_TOKEN from your database
  // let SECRET_TOKEN = getSecretToken(company_id);
  let SECRET_TOKEN = company_id;

  if (mode && token) {
    if (mode === "subscribe" && token === SECRET_TOKEN) {
      console.log("WEBHOOK_VERIFIED for company: " + company_id);
      res.status(200).send(challenge);
    } else {
      res.status(403);
    }
  }
});

app.post("/:company_id/webhook", (req, res) => {
  let body_param = req.body;
  let company_id = req.params.company_id;

  // Use the company_id to handle messages for the specific company

  if (body_param.object) {
    if (
      body_param.entry &&
      body_param.entry[0].changes &&
      body_param.entry[0].changes[0].value.messages &&
      body_param.entry[0].changes[0].value.messages[0]
    ) {
      let phone_no_id =
        body_param.entry[0].changes[0].value.metadata.phone_number_id;
      let from = body_param.entry[0].changes[0].value.messages[0].from;
      let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;

      // Emit message via Socket.io
      io.emit("receive-message", { from, msg_body, company_id });

      return res.status(200).json({ status: "ok" });
    } else {
      return res.status(400).json({ status: "Webhook error" });
    }
  }
});
