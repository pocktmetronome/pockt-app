require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PocktGlassProof'
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
  s.frameworks = 'Metal', 'UIKit', 'CoreHaptics', 'CoreMotion', 'QuartzCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  # Compile DialShader.metal into PocktGlassProof.bundle/default.metallib so it ships in the .app.
  s.source_files = '**/*.{h,m,mm,swift}'
  s.resource_bundles = { 'PocktGlassProof' => ['**/*.metal'] }
end
