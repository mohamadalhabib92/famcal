import ExpoModulesCore
import UIKit

/// Présent dans le binaire iOS. Sur iPhone la constante vaut false et aucun
/// raccourci n’est installé. Le profil Apple TV n’autolinke pas ce module.
public class FamcalMacModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FamcalMac")

    Constant("isiOSAppOnMac") {
      if #available(iOS 14.0, *) {
        return ProcessInfo.processInfo.isiOSAppOnMac
      }
      return false
    }

    Events("onKey")

    OnCreate {
      DispatchQueue.main.async { [weak self] in
        guard #available(iOS 14.0, *), ProcessInfo.processInfo.isiOSAppOnMac else { return }
        FamcalMacKeys.install { key in
          self?.sendEvent("onKey", ["key": key])
        }
      }
    }
  }
}

enum FamcalMacKeys {
  static var handler: ((String) -> Void)?
  private static var installed = false
  static var originalImp: IMP?
  private static let keySelector = #selector(getter: UIViewController.keyCommands)

  static func install(handler: @escaping (String) -> Void) {
    self.handler = handler
    guard !installed else { return }
    installed = true
    guard
      let original = class_getInstanceMethod(UIViewController.self, keySelector),
      let patched = class_getInstanceMethod(UIViewController.self, #selector(UIViewController.famcal_keyCommands))
    else { return }
    originalImp = method_getImplementation(original)
    method_exchangeImplementations(original, patched)
  }

  static func commands() -> [UIKeyCommand] {
    let specs: [(String, UIKeyModifierFlags)] = [
      (UIKeyCommand.inputEscape, []),
      ("f", .command),
    ]
    return specs.map { input, flags in
      let command = UIKeyCommand(input: input, modifierFlags: flags, action: #selector(UIViewController.famcal_onKey(_:)))
      if #available(iOS 15.0, *) {
        command.wantsPriorityOverSystemBehavior = true
      }
      return command
    }
  }

  static func name(for command: UIKeyCommand) -> String {
    switch command.input {
    case UIKeyCommand.inputEscape:
      return "escape"
    case "f":
      return command.modifierFlags.contains(.command) ? "find" : "ignore"
    default:
      return "ignore"
    }
  }

  static func existingCommands(on controller: UIViewController) -> [UIKeyCommand]? {
    guard let imp = originalImp else { return nil }
    let fn = unsafeBitCast(imp, to: (@convention(c) (AnyObject, Selector) -> [UIKeyCommand]?).self)
    return fn(controller, keySelector)
  }

  static func focusedText() -> UIView? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap(\.windows).first(where: \.isKeyWindow)
    var responder = window?.firstResponderView
    while let current = responder {
      if current is UITextField || current is UITextView { return current }
      responder = current.next as? UIView
    }
    return nil
  }
}

private extension UIView {
  var firstResponderView: UIView? {
    if isFirstResponder { return self }
    for child in subviews {
      if let found = child.firstResponderView { return found }
    }
    return nil
  }
}

extension UIViewController {
  @objc func famcal_keyCommands() -> [UIKeyCommand]? {
    let existing = FamcalMacKeys.existingCommands(on: self)
    guard #available(iOS 14.0, *), ProcessInfo.processInfo.isiOSAppOnMac else { return existing }
    return (existing ?? []) + FamcalMacKeys.commands()
  }

  @objc func famcal_onKey(_ sender: UIKeyCommand) {
    let key = FamcalMacKeys.name(for: sender)
    if key == "ignore" { return }
    if key == "escape", let text = FamcalMacKeys.focusedText() {
      text.resignFirstResponder()
      return
    }
    FamcalMacKeys.handler?(key)
  }
}
