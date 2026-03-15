import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function countTsLines(dir: string): number {
    let total = 0;

    const entries = readdirSync(dir);

    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            total += countTsLines(fullPath);
        } else if (entry.endsWith(".ts")) {
            const content = readFileSync(fullPath, "utf8");
            const lines = content.split("\n").length;
            total += lines;
        }
    }

    return total;
}

const folder = "./src";
const totalLines = countTsLines(folder);

console.log(`Total .ts lines in ${folder}: ${totalLines}`);