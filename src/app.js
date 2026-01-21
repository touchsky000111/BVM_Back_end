import express from "express";
import cors from "cors";
import searchRoute from "./routes/search.js";
import businessCentralRoute from "./routes/businesscentral.js";
import apiRoute from "./routes/api.js";
import morgan from "morgan";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/search", searchRoute);
app.use("/api/businesscentral", businessCentralRoute);
app.use("/api", apiRoute);
export default app;
