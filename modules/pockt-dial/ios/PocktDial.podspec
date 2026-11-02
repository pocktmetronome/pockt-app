require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PocktDial'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Metal', 'UIKit', 'CoreHaptics', 'CoreMotion', 'QuartzCore', 'CoreText', 'ImageIO'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  # Compile PocktDialShader.metal into PocktDial.bundle/default.metallib so it ships in the .app.
  # NEVER load shaders via makeDefaultLibrary(bundle: Bundle(for:)) on a static_framework pod.
  # Baked IBL maps (Resources/*.png) MUST travel in the same bundle — missing textures
  # are the build-116 class of failure (metallib compiled, maps not packaged).
  s.source_files = '**/*.{h,m,mm,swift}'
  s.resource_bundles = { 'PocktDial' => ['**/*.metal', '**/*.png', '**/*.wav'] }
end
