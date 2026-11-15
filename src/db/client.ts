import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/client";

// design 7.2: one client per service process, driver adapter mandatory,
// pool capped at 10 connections
const connectionString = process.env.DATABASE_URL as string;

const pool = new Pool({ connectionString, max: 10 });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export { prisma };
