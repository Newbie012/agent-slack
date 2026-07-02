import type { DriverState } from "../../state.js"
import { generateTokenGrantTestModel, toAuthProfile, type TokenGrantTestModel } from "./model.js"

export class AuthTestDriver {
  constructor(private readonly state: DriverState) {}

  setProfile(options: { readonly model?: Partial<TokenGrantTestModel> } = {}) {
    const model = generateTokenGrantTestModel(options.model)
    const profile = toAuthProfile(model)
    const index = this.state.profiles.findIndex((item) => item.name === profile.name)
    if (index >= 0) {
      this.state.profiles[index] = profile
    } else {
      this.state.profiles.push(profile)
    }
    return profile
  }

  clearProfiles() {
    this.state.profiles.length = 0
  }
}
