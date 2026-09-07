Name:           nous
Version:        %{?app_version}%{!?app_version:0.1.0}
Release:        1%{?dist}
Summary:        A private Fedora desktop client for local Ollama models
License:        MIT
URL:            https://github.com/AjayCSE29/Nous
Vendor:         Ajay
Packager:       Ajay
BuildArch:      x86_64

Requires:       gtk3
Requires:       libnotify
Requires:       nss
Requires:       libXScrnSaver
Requires:       xdg-utils
Requires:       at-spi2-core
Requires:       (libXtst or libXtst6)
Requires:       (libuuid or libuuid1)

%description
A private, Fedora-first Electron desktop client for local Ollama models.
Chat with locally installed models in the main window or the compact
always-on-top Companion window. No accounts, no telemetry, no cloud.

%install
install -d -m 0755 %{buildroot}/opt/Nous
cp -a %{unpacked_dir}/. %{buildroot}/opt/Nous/
install -d -m 0755 %{buildroot}%{_usr}/bin
ln -s /opt/Nous/nous %{buildroot}%{_usr}/bin/nous
install -d -m 0755 %{buildroot}%{_datadir}/icons/hicolor/2000x2000/apps
install -m 0644 %{repo_dir}/assets/icons/logo.png %{buildroot}%{_datadir}/icons/hicolor/2000x2000/apps/nous.png
install -d -m 0755 %{buildroot}%{_datadir}/icons/hicolor/512x512/apps
install -m 0644 %{icon_512} %{buildroot}%{_datadir}/icons/hicolor/512x512/apps/nous.png
install -d -m 0755 %{buildroot}%{_datadir}/icons/hicolor/scalable/apps
install -m 0644 %{repo_dir}/assets/icons/logo.svg %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/nous.svg
install -d -m 0755 %{buildroot}%{_datadir}/applications
install -m 0644 %{repo_dir}/packaging/nous.desktop %{buildroot}%{_datadir}/applications/nous.desktop

%post
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache %{_datadir}/icons/hicolor >/dev/null 2>&1 || :
fi
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database %{_datadir}/applications >/dev/null 2>&1 || :
fi

%postun
if [ "$1" -eq 0 ]; then
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache %{_datadir}/icons/hicolor >/dev/null 2>&1 || :
    fi
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database %{_datadir}/applications >/dev/null 2>&1 || :
    fi
fi

%files
/opt/Nous
%{_usr}/bin/nous
%{_datadir}/icons/hicolor/2000x2000/apps/nous.png
%{_datadir}/icons/hicolor/512x512/apps/nous.png
%{_datadir}/icons/hicolor/scalable/apps/nous.svg
%{_datadir}/applications/nous.desktop

%changelog
* Mon Sep 07 2026 Ajay - 0.1.0-1
- Initial Nous packaging.