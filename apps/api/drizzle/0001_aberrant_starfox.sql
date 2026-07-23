ALTER TABLE "deal_collaborators" ADD CONSTRAINT "deal_collaborators_deal_id_user_id_pk" PRIMARY KEY("deal_id","user_id");--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "client_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "deals_owner_id_client_id_unique" ON "deals" USING btree ("owner_id","client_id");