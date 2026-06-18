content = open('components/monitor/OsMetrics.tsx').read()
cut = content.index('cat > components/stress/StressControl.tsx')
good = content[:cut]
good = content[:cut]
good += '            {os.processes.slice(0, 8).map((p, i) => (\n'
good += '              <tr key={i} className="border-t border-gray-700">\n'
good += '                <td>{p.pid}</td><td>{p.user}</td><td>{p.cpu}</td><td>{p.mem}</td><td>{p.command}</td>\n'
good += '              </tr>\n'
good += '            ))}\n'
good += '          </tbody>\n        </table>\n      </div>\n    </div>\n  )\n}\n'
open('components/monitor/OsMetrics.tsx', 'w').write(good)
print('OK')
