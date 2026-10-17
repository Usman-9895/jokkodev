-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "codeLanguage" VARCHAR(30);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "codeLanguage" VARCHAR(30);

-- Un langage n'a de sens qu'avec un extrait de code.
ALTER TABLE "Question" ADD CONSTRAINT "Question_codeLanguage_check" CHECK ("code" IS NOT NULL OR "codeLanguage" IS NULL);
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_codeLanguage_check" CHECK ("code" IS NOT NULL OR "codeLanguage" IS NULL);
