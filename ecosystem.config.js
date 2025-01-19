module.exports = {
  apps: [{
    name: 'meu-orcamento-bot',
    script: './dist/index.js',
    node_args: '-r ./dist/register.js',
    env: {
      NODE_ENV: 'production'
    },
    time: true,
    exp_backoff_restart_delay: 100,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};