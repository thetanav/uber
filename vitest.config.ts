<file_path>
uber/backend/vitest.config.ts
</file_path>

<edit_description>
Create Vitest configuration file
</edit_description>

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
