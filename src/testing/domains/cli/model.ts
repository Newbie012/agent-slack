export interface CliRunTestModel {
  readonly args: readonly string[]
}

export const generateCliRunTestModel = (
  overrides: Partial<CliRunTestModel> = {}
): CliRunTestModel => ({
  args: overrides.args ?? ["describe", "--json"]
})

export const toCliRunOptions = (model: CliRunTestModel) => ({
  args: model.args
})
