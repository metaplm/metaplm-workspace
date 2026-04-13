-- Drop old single-contact foreign key and column from Activity
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_contactId_fkey";
ALTER TABLE "Activity" DROP COLUMN IF EXISTS "contactId";

-- CreateTable: _ActivityContacts (implicit many-to-many join table)
CREATE TABLE "_ActivityContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ActivityContacts_AB_unique" ON "_ActivityContacts"("A", "B");
CREATE INDEX "_ActivityContacts_B_index" ON "_ActivityContacts"("B");

-- AddForeignKey
ALTER TABLE "_ActivityContacts" ADD CONSTRAINT "_ActivityContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ActivityContacts" ADD CONSTRAINT "_ActivityContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
