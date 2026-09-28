CREATE TYPE "public"."terrain" AS ENUM('flat', 'rolling', 'hilly', 'mountainous', 'mixed', 'treadmill', 'track');--> statement-breakpoint
CREATE TYPE "public"."time_of_day" AS ENUM('dawn', 'morning', 'day', 'afternoon', 'evening', 'night');--> statement-breakpoint
CREATE TYPE "public"."weather" AS ENUM('sunny', 'cloudy', 'rainy', 'hot', 'cold', 'windy');--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "time_of_day" time_of_day;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "terrain" "terrain";--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "weather" "weather";