import "blazebuild/types/build.d";

import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { $ } from "bun";
import { glob } from "glob";
import path from "path";

class LintTask extends AbstractTask {
    @TaskAction
    protected override async run() {
        await $`eslint "${process.cwd()}/src"`;
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return glob(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default LintTask;
