import React from 'react';
import { Appearance, View } from 'react-native';
import { ThemeProvider } from '@/kit/theme';
import { Button, T } from '@/kit/ui';
import { paletteFor } from '@/theme';
import { captureException } from '@/lib/crash';

type Props = { children: React.ReactNode };
type St = { error: Error | null };

/** Évite l’écran blanc : toute erreur de rendu affiche un repli et conserve les données locales. */
export class ErrorBoundary extends React.Component<Props, St> {
  state: St = { error: null };

  static getDerivedStateFromError(error: Error): St {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, info.componentStack?.slice(0, 180) || 'render');
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ThemeProvider value={paletteFor(Appearance.getColorScheme?.())}>
        <View accessibilityRole="alert" style={{ flex: 1, backgroundColor: paletteFor(Appearance.getColorScheme?.()).bg, padding: 24, gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <T v="h2">Un problème est survenu</T>
          <T muted>FamCal a rencontré une erreur d’affichage. Vos données locales sont conservées sur cet appareil.</T>
          <Button title="Réessayer" icon="refresh" onPress={this.reset} />
        </View>
      </ThemeProvider>
    );
  }
}
