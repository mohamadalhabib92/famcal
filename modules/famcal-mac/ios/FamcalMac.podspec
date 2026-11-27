Pod::Spec.new do |s|
  s.name           = 'FamcalMac'
  s.version        = '1.0.0'
  s.summary        = 'isiOSAppOnMac for Familycal'
  s.homepage       = 'https://github.com/mohamadalhabib92/famcal'
  s.license        = 'MIT'
  s.author         = 'Familycal'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
end
