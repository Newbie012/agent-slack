import { AuthTestDriver } from "./domains/auth/index.js"
import { CliTestDriver } from "./domains/cli/index.js"
import { EmulateTestDriver } from "./domains/emulate/index.js"
import { SlackTestDriver } from "./domains/slack/index.js"
import { createTestServices } from "./services.js"
import { createDriverState, type DriverState } from "./state.js"

export class SlackCliTestDriver implements AsyncDisposable {
  readonly auth: AuthTestDriver
  readonly cli: CliTestDriver
  readonly slack: SlackTestDriver
  readonly emulate: EmulateTestDriver

  private constructor(private readonly state: DriverState) {
    const services = createTestServices(state)
    this.auth = new AuthTestDriver(state)
    this.cli = new CliTestDriver(services)
    this.slack = new SlackTestDriver(state)
    this.emulate = new EmulateTestDriver(state)
  }

  static async create(): Promise<SlackCliTestDriver> {
    return new SlackCliTestDriver(createDriverState())
  }

  snapshot() {
    return this.state
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.emulate.close()
    this.state.profiles.length = 0
    this.state.slackStubs.length = 0
    this.state.slackCalls.length = 0
    this.state.fileDownloads.length = 0
    this.state.openedOAuthUrls.length = 0
    this.state.emulateUrl = null
  }
}
